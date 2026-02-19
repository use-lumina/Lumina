# Lumina + OpenAI Basic Integration (Python)

Simple example showing how to instrument OpenAI calls with Lumina observability.

## Prerequisites

- Lumina running locally (see [Quickstart](../../../docs/guides/QUICKSTART.md))
- Python 3.9+
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Quick Start

### 1. Start Lumina

```bash
cd ../../../infra/docker
docker-compose up -d
```

Verify it's running:

```bash
curl http://localhost:8080/health
# {"status":"ok","service":"lumina-ingestion"}
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and fill in your OPENAI_API_KEY
export OPENAI_API_KEY=sk-...
```

### 4. Run

```bash
python main.py
```

## What You'll See

```
Lumina + OpenAI Integration Example
==================================================

Sending prompt: What is the capital of France?
Response: The capital of France is Paris.
Cost: $0.000090
Tokens: 30
Trace sent to Lumina!

Sending prompt: Explain quantum computing in one sentence.
Response: Quantum computing uses quantum bits...
Cost: $0.000120
Tokens: 40
Trace sent to Lumina!

Done! Check your traces at http://localhost:3000/traces
```

## How It Works

```python
import openai
from lumina import init_lumina

client = openai.OpenAI(api_key="...")

# No API key needed for self-hosted!
lumina = init_lumina({
    "endpoint": "http://localhost:8080/v1/traces",
    "service_name": "my-app",
})

# Wrap your OpenAI call
response = lumina.trace_llm(
    lambda: client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Hello!"}],
    ),
    name="chat",
    system="openai",
    prompt="Hello!",
)
```

Lumina automatically captures:

- Prompt and response text
- Token usage (prompt + completion)
- Cost (auto-calculated from model pricing)
- Latency
- Model name
- Errors

## What Gets Tracked

| Field    | Example                            |
| -------- | ---------------------------------- |
| Provider | `openai`                           |
| Model    | `gpt-4`                            |
| Prompt   | `"What is the capital of France?"` |
| Response | `"The capital of France is Paris."`|
| Tokens   | `{ prompt: 10, completion: 8 }`    |
| Cost     | `$0.00009` (auto-calculated)       |
| Latency  | `1234ms`                           |
| Status   | `success` or `error`               |

## Troubleshooting

**`Connection refused`** — Make sure Lumina is running: `docker-compose ps`

**`OPENAI_API_KEY` not set** — Run `export OPENAI_API_KEY=sk-...`

**Traces not showing in dashboard** — Wait a few seconds (traces are batched), then check http://localhost:3000/traces
