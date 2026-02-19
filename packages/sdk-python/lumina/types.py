from __future__ import annotations

from dataclasses import dataclass
from typing import Any, List, Literal, Optional, TypedDict


@dataclass
class SdkConfig:
    endpoint: str = "http://localhost:9411/v1/traces"
    environment: Literal["live", "test"] = "live"
    enabled: bool = True
    batch_size: int = 10
    batch_interval_ms: int = 5000
    timeout_ms: int = 30000
    max_retries: int = 3
    api_key: Optional[str] = None
    service_name: Optional[str] = None
    customer_id: Optional[str] = None
    flush_interval_ms: Optional[int] = None


class Trace(TypedDict, total=False):
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    timestamp: str
    service_name: str
    endpoint: str
    environment: str
    provider: Optional[str]
    model: str
    prompt: str
    response: str
    response_hash: Optional[str]
    tokens: Optional[int]
    prompt_tokens: Optional[int]
    completion_tokens: Optional[int]
    total_tokens: Optional[int]
    latency_ms: int
    cost_usd: float
    status: Optional[Literal["success", "error"]]
    error_message: Optional[str]
    metadata: Optional[dict[str, Any]]
    tags: Optional[List[str]]
    customer_id: Optional[str]


class Alert(TypedDict, total=False):
    alert_id: str
    trace_id: str
    service_name: str
    endpoint: str
    alert_type: Literal["cost_spike", "quality_drop", "cost_and_quality"]
    severity: Literal["low", "medium", "high", "critical"]
    message: str
    baseline_value: Optional[float]
    current_value: float
    threshold: float
    created_at: str
    resolved_at: Optional[str]


class IngestRequest(TypedDict):
    traces: List[Trace]


class IngestResponse(TypedDict, total=False):
    success: bool
    traces_received: int
    errors: Optional[List[str]]
