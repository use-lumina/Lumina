# Lumina + Anthropic (Claude) Basic Integration (Python)

Simple example showing how to instrument Anthropic Claude calls with Lumina observability.

## Prerequisites

- Lumina running locally (see [Quickstart](../../../docs/guides/QUICKSTART.md))
- Python 3.9+
- Anthropic API key ([Get one here](https://console.anthropic.com/))

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
# Edit .env and fill in your ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 4. Run

```bash
python main.py
```

## What You'll See

```
Lumina + Anthropic (Claude) Integration Example
==================================================

Sending prompt: What is the capital of France?
Response: The capital of France is Paris.
Cost: $0.000045
Tokens: 10 input + 8 output = 18 total
Trace sent to Lumina!

Sending prompt: Explain quantum computing in one sentence.
Response: Quantum computing harnesses quantum mechanics...
Cost: $0.000060
Tokens: 12 input + 15 output = 27 total
Trace sent to Lumina!

Sending prompt: Write a haiku about observability.
Response:
    Traces flow like streams
    Metrics light the hidden path
    Systems whisper truth
Cost: $0.000075
Tokens: 10 input + 20 output = 30 total
Trace sent to Lumina!

Done! Check your traces at http://localhost:3000/traces
```

## How It Works

```python
import anthropic
from lumina import init_lumina

client = anthropic.Anthropic(api_key="...")

# No API key needed for self-hosted!
lumina = init_lumina({
    "endpoint": "http://localhost:8080/v1/traces",
    "service_name": "my-app",
})

# Wrap your Anthropic call
response = lumina.trace_llm(
    lambda: client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Hello!"}],
    ),
    name="chat",
    system="anthropic",
    prompt="Hello!",
)
```

Lumina automatically captures:

- Prompt and response text
- Token usage (input + output)
- Cost (auto-calculated from model pricing)
- Latency
- Model name
- Errors

## What Gets Tracked

| Field    | Example                               |
| -------- | ------------------------------------- |
| Provider | `anthropic`                           |
| Model    | `claude-sonnet-4-5`                   |
| Prompt   | `"What is the capital of France?"`    |
| Response | `"The capital of France is Paris."`   |
| Tokens   | `{ input: 10, output: 8, total: 18 }` |
| Cost     | `$0.000045` (auto-calculated)         |
| Latency  | `1234ms`                              |
| Status   | `success` or `error`                  |

## Claude Models

| Model               | Input         | Output        | Use Case     |
| ------------------- | ------------- | ------------- | ------------ |
| `claude-opus-4-5`   | $15.00 / 1M   | $75.00 / 1M   | Most capable |
| `claude-sonnet-4-5` | $3.00 / 1M    | $15.00 / 1M   | Balanced     |
| `claude-haiku-4-5`  | $0.25 / 1M    | $1.25 / 1M    | Fast & cheap |

## Troubleshooting

**`Connection refused`** — Make sure Lumina is running: `docker-compose ps`

**`ANTHROPIC_API_KEY` not set** — Run `export ANTHROPIC_API_KEY=sk-ant-...`

**Traces not showing in dashboard** — Wait a few seconds (traces are batched), then check http://localhost:3000/traces
