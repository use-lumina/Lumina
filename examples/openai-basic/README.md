# Lumina + OpenAI Basic Integration

Simple example demonstrating how to integrate Lumina observability with OpenAI SDK.

## Prerequisites

- Lumina running (see [Quickstart Guide](../../docs/guides/QUICKSTART.md))
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Quick Start

### 1. Start Lumina

```bash
cd ../../infra/docker
docker-compose up -d
```

Verify it's running:

```bash
curl http://localhost:8080/health
# Should return: {"status":"ok","service":"lumina-ingestion"}
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Set Your OpenAI API Key

```bash
export OPENAI_API_KEY=sk-...
```

### 4. Run the Example

```bash
bun run start
```

## What You'll See

```
🚀 Lumina + OpenAI Integration Example
==================================================

📤 Sending prompt: What is the capital of France?
📥 Response: The capital of France is Paris.
💰 Cost: $0.000090
📊 Tokens: 30
✅ Trace sent to Lumina!

📤 Sending prompt: Explain quantum computing in one sentence.
📥 Response: Quantum computing uses quantum bits...
💰 Cost: $0.000120
📊 Tokens: 40
✅ Trace sent to Lumina!

✨ Done! Check your traces at http://localhost:3000/traces
```

### 5. View Your Traces

Open http://localhost:3000/traces to see your captured LLM calls with:

- Prompt and response
- Token usage and cost
- Latency
- Model information

## How It Works

```typescript
import OpenAI from 'openai';
import { Lumina } from '@lumina/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// No API key needed for self-hosted!
const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
  serviceName: 'my-app',
});

// Wrap your OpenAI call
const response = await lumina.traceLLM(
  async () => {
    return await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    });
  },
  {
    name: 'chat',
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'Hello!',
  }
);
```

That's it! Lumina automatically captures:

- ✅ Prompt and response
- ✅ Token usage and cost
- ✅ Latency
- ✅ Model information
- ✅ Errors and retries

## What Gets Tracked

Every LLM call is captured with:

| Field    | Example                                    |
| -------- | ------------------------------------------ |
| Provider | `openai`                                   |
| Model    | `gpt-4`                                    |
| Prompt   | `"What is the capital of France?"`         |
| Response | `"The capital of France is Paris."`        |
| Tokens   | `{ prompt: 10, completion: 8, total: 18 }` |
| Cost     | `$0.00009` (auto-calculated)               |
| Latency  | `1234ms`                                   |
| Status   | `success` or `error`                       |

## Next Steps

- 🔍 Explore the [Dashboard](http://localhost:3000)
- 🚨 Set up [Alerts](../../docs/guides/ALERTS.md) for cost spikes
- 🔁 Try [Replay](../../docs/guides/REPLAY.md) to test changes
- 📖 Read the [API Reference](../../docs/api/API_REFERENCE.md)

## Troubleshooting

**"Connection refused" error:**

- Make sure Lumina is running: `docker-compose ps`
- Check the ingestion service: `curl http://localhost:8080/health`

**"Invalid API key" from OpenAI:**

- Verify your OpenAI API key is set: `echo $OPENAI_API_KEY`
- Check you have credits in your OpenAI account

**Traces not appearing in dashboard:**

- Wait a few seconds (traces are batched)
- Check the example logs for errors
- Verify dashboard is running: http://localhost:3000

## Learn More

- [Lumina Documentation](../../docs/guides/QUICKSTART.md)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Integration Guides](../../docs/guides/INTEGRATIONS.md)
