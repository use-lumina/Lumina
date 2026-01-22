# Lumina + Anthropic (Claude) Basic Integration

Simple example demonstrating how to integrate Lumina observability with Anthropic's Claude SDK.

## Prerequisites

- Lumina running (see [Quickstart Guide](../../docs/guides/QUICKSTART.md))
- Anthropic API key ([Get one here](https://console.anthropic.com/))

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

### 3. Set Your Anthropic API Key

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 4. Run the Example

```bash
bun run start
```

## What You'll See

```
🚀 Lumina + Anthropic (Claude) Integration Example
==================================================

📤 Sending prompt: What is the capital of France?
📥 Response: The capital of France is Paris.
💰 Cost: $0.000045
📊 Tokens: 10 input + 8 output = 18 total
✅ Trace sent to Lumina!

📤 Sending prompt: Explain quantum computing in one sentence.
📥 Response: Quantum computing harnesses quantum mechanics...
💰 Cost: $0.000060
📊 Tokens: 12 input + 15 output = 27 total
✅ Trace sent to Lumina!

📤 Sending prompt: Write a haiku about observability.
📥 Response:
    Traces flow like streams
    Metrics light the hidden path
    Systems whisper truth
💰 Cost: $0.000075
📊 Tokens: 10 input + 20 output = 30 total
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
import Anthropic from '@anthropic-ai/sdk';
import { Lumina } from '@lumina/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// No API key needed for self-hosted!
const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
  serviceName: 'my-app',
});

// Wrap your Anthropic call
const response = await lumina.traceLLM(
  async () => {
    return await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello!' }],
    });
  },
  {
    name: 'chat',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
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

Lumina works with all Claude models:

| Model               | Input Cost | Output Cost | Use Case     |
| ------------------- | ---------- | ----------- | ------------ |
| `claude-opus-4-5`   | $0.015/1M  | $0.075/1M   | Most capable |
| `claude-sonnet-4-5` | $0.003/1M  | $0.015/1M   | Balanced     |
| `claude-haiku-4-5`  | $0.0008/1M | $0.004/1M   | Fast & cheap |

## Next Steps

- 🔍 Explore the [Dashboard](http://localhost:3000)
- 🚨 Set up [Alerts](../../docs/guides/ALERTS.md) for cost spikes
- 🔁 Try [Replay](../../docs/guides/REPLAY.md) to test prompt changes
- 📖 Read the [API Reference](../../docs/api/API_REFERENCE.md)

## Advanced Usage

### Stream Responses

```typescript
const stream = await lumina.traceLLM(
  async () => {
    return await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Tell me a story' }],
      stream: true,
    });
  },
  {
    name: 'stream-chat',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    prompt: 'Tell me a story',
  }
);

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    process.stdout.write(chunk.delta.text);
  }
}
```

### With System Prompts

```typescript
const response = await lumina.traceLLM(
  async () => {
    return await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: 'You are a helpful AI assistant focused on observability.',
      messages: [{ role: 'user', content: 'What is tracing?' }],
    });
  },
  {
    name: 'system-prompt-chat',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    prompt: 'What is tracing?',
    metadata: {
      system_prompt: 'You are a helpful AI assistant focused on observability.',
    },
  }
);
```

## Troubleshooting

**"Connection refused" error:**

- Make sure Lumina is running: `docker-compose ps`
- Check the ingestion service: `curl http://localhost:8080/health`

**"Invalid API key" from Anthropic:**

- Verify your Anthropic API key is set: `echo $ANTHROPIC_API_KEY`
- Check you have credits in your Anthropic account

**Traces not appearing in dashboard:**

- Wait a few seconds (traces are batched)
- Check the example logs for errors
- Verify dashboard is running: http://localhost:3000

## Learn More

- [Lumina Documentation](../../docs/guides/QUICKSTART.md)
- [Anthropic API Reference](https://docs.anthropic.com/en/api)
- [Integration Guides](../../docs/guides/INTEGRATIONS.md)
- [Claude Models Overview](https://www.anthropic.com/api)
