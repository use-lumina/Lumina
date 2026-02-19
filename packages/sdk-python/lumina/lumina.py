from __future__ import annotations

import asyncio
import inspect
import json
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union

from opentelemetry import trace as otel_trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Span, StatusCode

from . import semantic_conventions as SC
from .config import load_sdk_config
from .types import SdkConfig

T = TypeVar("T")

_instance: Optional["Lumina"] = None

# Pricing per 1M tokens: {model_key: (input_usd, output_usd)}
_PRICING: Dict[str, tuple[float, float]] = {
    "gpt-4": (30.0, 60.0),
    "gpt-4-turbo": (10.0, 30.0),
    "gpt-3.5-turbo": (0.5, 1.5),
    "claude-sonnet-4": (3.0, 15.0),
    "claude-3-opus": (15.0, 75.0),
    "claude-3-sonnet": (3.0, 15.0),
    "claude-3-haiku": (0.25, 1.25),
}


class Lumina:
    """
    Main Lumina SDK class — OpenTelemetry-native LLM observability.

    Usage::

        from lumina import init_lumina

        lumina = init_lumina({"api_key": "...", "service_name": "my-app"})
        result = await lumina.trace_llm(
            lambda: openai_client.chat.completions.create(...),
            name="summarize",
            system="openai",
        )
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None) -> None:
        global _instance
        self.config: SdkConfig = load_sdk_config(config)
        self._provider: TracerProvider = self._init_provider()
        self._tracer = self._provider.get_tracer("lumina-sdk", "0.1.0")
        _instance = self

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------

    def _init_provider(self) -> TracerProvider:
        resource_attrs: Dict[str, Any] = {
            "service.name": self.config.service_name or "unknown-service",
            "service.version": "0.1.0",
            SC.LUMINA_ENVIRONMENT: self.config.environment,
        }
        if self.config.customer_id:
            resource_attrs[SC.LUMINA_CUSTOMER_ID] = self.config.customer_id

        resource = Resource.create(resource_attrs)

        headers: Dict[str, str] = {}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        exporter = OTLPSpanExporter(
            endpoint=self.config.endpoint,
            headers=headers,
        )

        processor = BatchSpanProcessor(
            exporter,
            max_queue_size=self.config.batch_size,
            schedule_delay_millis=self.config.batch_interval_ms,
            export_timeout_millis=self.config.timeout_ms,
            max_export_batch_size=self.config.batch_size,
        )

        provider = TracerProvider(resource=resource)
        provider.add_span_processor(processor)
        otel_trace.set_tracer_provider(provider)
        return provider

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def trace(
        self,
        name: str,
        fn: Callable[[Span], Any],
        *,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
    ) -> Any:
        """
        Trace a block of code as a single span.

        Works for both sync and async callables — pass either a regular
        function or a coroutine function; the correct execution path is
        chosen automatically.

        The callable receives the active :class:`opentelemetry.trace.Span`
        so it can add custom attributes.
        """
        if inspect.iscoroutinefunction(fn):
            return self._trace_async(name, fn, metadata=metadata, tags=tags)
        return self._trace_sync(name, fn, metadata=metadata, tags=tags)

    def trace_llm(
        self,
        fn: Callable[[], Any],
        *,
        name: str = SC.SPAN_NAME_LLM_REQUEST,
        system: Optional[str] = None,
        prompt: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
    ) -> Any:
        """
        Trace a single LLM call with automatic attribute extraction.

        Handles both OpenAI and Anthropic response shapes.  Like
        :meth:`trace`, this works for sync and async callables.
        """
        if inspect.iscoroutinefunction(fn):
            return self._trace_llm_async(
                fn, name=name, system=system, prompt=prompt, metadata=metadata, tags=tags
            )
        return self._trace_llm_sync(
            fn, name=name, system=system, prompt=prompt, metadata=metadata, tags=tags
        )

    async def flush(self) -> None:
        """Flush all pending spans immediately."""
        self._provider.force_flush()

    async def shutdown(self) -> None:
        """Shutdown the SDK and flush remaining spans."""
        self._provider.shutdown()

    def is_enabled(self) -> bool:
        return self.config.enabled

    def get_config(self) -> SdkConfig:
        return self.config

    # ------------------------------------------------------------------
    # Sync internals
    # ------------------------------------------------------------------

    def _trace_sync(
        self,
        name: str,
        fn: Callable[[Span], Any],
        *,
        metadata: Optional[Dict[str, Any]],
        tags: Optional[List[str]],
    ) -> Any:
        import time

        with self._tracer.start_as_current_span(name) as span:
            start = time.monotonic()
            try:
                self._set_common_attrs(span, metadata, tags)
                result = fn(span)
                span.set_attribute("duration_ms", int((time.monotonic() - start) * 1000))
                span.set_status(StatusCode.OK)
                return result
            except Exception as exc:
                span.record_exception(exc)
                span.set_status(StatusCode.ERROR, str(exc))
                raise

    def _trace_llm_sync(
        self,
        fn: Callable[[], Any],
        *,
        name: str,
        system: Optional[str],
        prompt: Optional[str],
        metadata: Optional[Dict[str, Any]],
        tags: Optional[List[str]],
    ) -> Any:
        def _inner(span: Span) -> Any:
            self._set_llm_pre_attrs(span, system, prompt)
            result = fn()
            self._set_llm_post_attrs(span, result)
            return result

        return self._trace_sync(name, _inner, metadata=metadata, tags=tags)

    # ------------------------------------------------------------------
    # Async internals
    # ------------------------------------------------------------------

    async def _trace_async(
        self,
        name: str,
        fn: Callable[[Span], Any],
        *,
        metadata: Optional[Dict[str, Any]],
        tags: Optional[List[str]],
    ) -> Any:
        import time

        with self._tracer.start_as_current_span(name) as span:
            start = time.monotonic()
            try:
                self._set_common_attrs(span, metadata, tags)
                result = await fn(span)
                span.set_attribute("duration_ms", int((time.monotonic() - start) * 1000))
                span.set_status(StatusCode.OK)
                return result
            except Exception as exc:
                span.record_exception(exc)
                span.set_status(StatusCode.ERROR, str(exc))
                raise

    async def _trace_llm_async(
        self,
        fn: Callable[[], Any],
        *,
        name: str,
        system: Optional[str],
        prompt: Optional[str],
        metadata: Optional[Dict[str, Any]],
        tags: Optional[List[str]],
    ) -> Any:
        async def _inner(span: Span) -> Any:
            self._set_llm_pre_attrs(span, system, prompt)
            result = await fn()
            self._set_llm_post_attrs(span, result)
            return result

        return await self._trace_async(name, _inner, metadata=metadata, tags=tags)

    # ------------------------------------------------------------------
    # Attribute helpers
    # ------------------------------------------------------------------

    def _set_common_attrs(
        self,
        span: Span,
        metadata: Optional[Dict[str, Any]],
        tags: Optional[List[str]],
    ) -> None:
        if metadata:
            for key, value in metadata.items():
                span.set_attribute(key, json.dumps(value))
        if tags:
            span.set_attribute(SC.LUMINA_TAGS, json.dumps(tags))
        span.set_attribute(SC.LUMINA_ENVIRONMENT, self.config.environment)
        if self.config.service_name:
            span.set_attribute(SC.LUMINA_SERVICE_NAME, self.config.service_name)

    def _set_llm_pre_attrs(
        self, span: Span, system: Optional[str], prompt: Optional[str]
    ) -> None:
        if system:
            span.set_attribute(SC.LLM_SYSTEM, system)
        if prompt:
            span.set_attribute(SC.LLM_PROMPT, prompt)

    def _set_llm_post_attrs(self, span: Span, result: Any) -> None:
        model: str = getattr(result, "model", "") or ""
        if model:
            span.set_attribute(SC.LLM_RESPONSE_MODEL, model)

        response_id: str = getattr(result, "id", "") or ""
        if response_id:
            span.set_attribute(SC.LLM_RESPONSE_ID, response_id)

        # Extract completion text — OpenAI or Anthropic format
        completion = ""
        choices = getattr(result, "choices", None)
        if choices and isinstance(choices, list):
            # OpenAI: result.choices[0].message.content
            msg = getattr(choices[0], "message", None)
            completion = (getattr(msg, "content", None) or "") if msg else ""
        else:
            content = getattr(result, "content", None)
            if isinstance(content, list) and content:
                # Anthropic: result.content[0].text
                first = content[0]
                if getattr(first, "type", None) == "text":
                    completion = getattr(first, "text", "") or ""
            elif isinstance(content, str):
                completion = content

        if completion:
            span.set_attribute(SC.LLM_COMPLETION, completion)

        usage = getattr(result, "usage", None)
        if usage:
            prompt_tokens: int = (
                getattr(usage, "prompt_tokens", None) or getattr(usage, "input_tokens", None) or 0
            )
            completion_tokens: int = (
                getattr(usage, "completion_tokens", None)
                or getattr(usage, "output_tokens", None)
                or 0
            )
            total_tokens: int = (
                getattr(usage, "total_tokens", None) or prompt_tokens + completion_tokens
            )

            if prompt_tokens:
                span.set_attribute(SC.LLM_USAGE_PROMPT_TOKENS, prompt_tokens)
            if completion_tokens:
                span.set_attribute(SC.LLM_USAGE_COMPLETION_TOKENS, completion_tokens)
            if total_tokens:
                span.set_attribute(SC.LLM_USAGE_TOTAL_TOKENS, total_tokens)

            cost = _calculate_cost(model, prompt_tokens, completion_tokens)
            if cost > 0:
                span.set_attribute(SC.LUMINA_COST_USD, cost)

    # ------------------------------------------------------------------
    # Cost calculation
    # ------------------------------------------------------------------


def _calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate cost in USD based on model and token counts."""
    model_key = next((k for k in _PRICING if k in model), None)
    input_price, output_price = _PRICING.get(model_key or "", (1.0, 2.0))
    return (prompt_tokens / 1_000_000) * input_price + (completion_tokens / 1_000_000) * output_price


# ------------------------------------------------------------------
# Module-level helpers
# ------------------------------------------------------------------


def init_lumina(config: Optional[Dict[str, Any]] = None) -> "Lumina":
    """Create and store a module-level Lumina singleton."""
    return Lumina(config)


def get_lumina() -> Optional["Lumina"]:
    """Retrieve the current module-level Lumina singleton."""
    return _instance
