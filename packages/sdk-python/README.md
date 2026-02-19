# lumina-sdk

Python SDK for [Lumina](https://uselumina.com) — OpenTelemetry-native LLM observability.

## Installation

```bash
pip install lumina-sdk
```

Or install directly from the monorepo for development:

```bash
pip install -e packages/sdk-python/
```

## Quick start

```python
import os
from lumina import init_lumina

lumina = init_lumina({
    "api_key": os.environ["LUMINA_API_KEY"],
    "service_name": "my-app",
    "endpoint": "https://collector.lumina.app/v1/traces",
})

# Trace an OpenAI call
import openai
client = openai.OpenAI()

response = lumina.trace_llm(
    lambda: client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Hello!"}],
    ),
    name="greeting",
    system="openai",
    prompt="Hello!",
)
print(response.choices[0].message.content)
```

### Async usage

```python
import asyncio
import openai
from lumina import init_lumina

lumina = init_lumina({"service_name": "my-app"})
client = openai.AsyncOpenAI()

async def main():
    response = await lumina.trace_llm(
        lambda: client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": "Hello!"}],
        ),
        name="greeting",
        system="openai",
    )
    print(response.choices[0].message.content)

asyncio.run(main())
```

### Custom spans

```python
result = lumina.trace(
    "rag_pipeline",
    lambda span: run_rag(span),
    metadata={"query": "What is observability?"},
    tags=["rag", "production"],
)
```

## Environment variables

| Variable                   | Default                           | Description                        |
| -------------------------- | --------------------------------- | ---------------------------------- |
| `LUMINA_API_KEY`           | —                                 | API key (omit for self-hosted)     |
| `LUMINA_ENDPOINT`          | `http://localhost:9411/v1/traces` | OTLP collector URL                 |
| `LUMINA_SERVICE_NAME`      | —                                 | Service name attached to all spans |
| `LUMINA_ENVIRONMENT`       | `live`                            | `live` or `test`                   |
| `LUMINA_CUSTOMER_ID`       | —                                 | Customer identifier                |
| `LUMINA_ENABLED`           | `true`                            | Set to `false` to disable          |
| `LUMINA_BATCH_SIZE`        | `10`                              | Max spans per export batch         |
| `LUMINA_BATCH_INTERVAL_MS` | `5000`                            | Batch flush interval (ms)          |
| `LUMINA_MAX_RETRIES`       | `3`                               | Export retry count                 |
| `LUMINA_TIMEOUT_MS`        | `30000`                           | Export timeout (ms)                |
