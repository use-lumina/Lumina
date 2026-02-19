from __future__ import annotations

import os
from typing import Any, Dict

from .types import SdkConfig


def load_sdk_config(overrides: Dict[str, Any] | None = None) -> SdkConfig:
    """Load SDK configuration from environment variables, applying overrides last."""
    enabled_str = os.environ.get("LUMINA_ENABLED", "true").lower()
    enabled = enabled_str not in ("false", "0", "no")

    batch_interval_ms = int(os.environ.get("LUMINA_BATCH_INTERVAL_MS", "5000"))

    config = SdkConfig(
        api_key=os.environ.get("LUMINA_API_KEY"),
        endpoint=os.environ.get("LUMINA_ENDPOINT", "http://localhost:9411/v1/traces"),
        service_name=os.environ.get("LUMINA_SERVICE_NAME"),
        environment=os.environ.get("LUMINA_ENVIRONMENT", "live"),  # type: ignore[arg-type]
        customer_id=os.environ.get("LUMINA_CUSTOMER_ID"),
        enabled=enabled,
        batch_size=int(os.environ.get("LUMINA_BATCH_SIZE", "10")),
        batch_interval_ms=batch_interval_ms,
        flush_interval_ms=batch_interval_ms,
        max_retries=int(os.environ.get("LUMINA_MAX_RETRIES", "3")),
        timeout_ms=int(os.environ.get("LUMINA_TIMEOUT_MS", "30000")),
    )

    if overrides:
        for key, value in overrides.items():
            if hasattr(config, key) and value is not None:
                setattr(config, key, value)

    return config
