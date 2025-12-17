# @lumina/sdk

Official TypeScript/JavaScript SDK for Lumina - AI Observability Platform

## Installation

```bash
npm install @lumina/sdk
# or
bun add @lumina/sdk
# or
yarn add @lumina/sdk
```

## Quick Start

### 1. Get your API key

Sign up at [lumina.app](https://lumina.app) and get your API key from the dashboard.

### 2. Initialize the SDK

```typescript
import { initLumina } from '@lumina/sdk';

const lumina = initLumina({
  apiKey: process.env.LUMINA_API_KEY,
  environment: 'live', // or 'test'
});
```

### 3. Trace your LLM calls

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI();

// Wrap your LLM calls with lumina.trace()
const response = await lumina.trace(async () => {
  return await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }],
  });
});

console.log(response);
```

That's it! Your LLM calls are now being tracked.

## Configuration

### Environment Variables

```bash
LUMINA_API_KEY=lumina_live_your_api_key_here
LUMINA_ENDPOINT=https://ingestion.lumina.app/ingest
LUMINA_ENVIRONMENT=live
LUMINA_ENABLED=true
```

### Programmatic Configuration

```typescript
import { initLumina } from '@lumina/sdk';

const lumina = initLumina({
  apiKey: 'lumina_live_...',
  endpoint: 'https://ingestion.lumina.app/ingest',
  environment: 'live',
  batchSize: 10,
  batchIntervalMs: 5000,
  timeoutMs: 10000,
  maxRetries: 3,
  enabled: true,
});
```

## Usage Examples

### Basic Tracing

```typescript
const response = await lumina.trace(
  async () => {
    return await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'What is 2+2?' }],
    });
  },
  {
    name: '/api/chat',
    tags: ['production', 'math-qa'],
    metadata: {
      userId: 'user-123',
      sessionId: 'session-456',
    },
  }
);
```

### Manual Trace Creation

For cases where auto-instrumentation doesn't work:

```typescript
await lumina.createTrace({
  prompt: 'What is the capital of France?',
  response: 'The capital of France is Paris.',
  model: 'gpt-4',
  tokens: 50,
  latency_ms: 245,
  cost_usd: 0.002,
  tags: ['geography', 'qa'],
  metadata: {
    userId: 'user-123',
  },
});
```

### Flushing Traces

Traces are batched and sent automatically, but you can force a flush:

```typescript
// Flush all pending traces immediately
await lumina.flush();

// Shutdown SDK and flush remaining traces (e.g., on process exit)
process.on('SIGTERM', async () => {
  await lumina.shutdown();
  process.exit(0);
});
```

### Conditional Tracing

```typescript
// Only trace in production
const lumina = initLumina({
  apiKey: process.env.LUMINA_API_KEY,
  enabled: process.env.NODE_ENV === 'production',
});

// Check if enabled
if (lumina.isEnabled()) {
  console.log('Lumina is tracking your LLM calls');
}
```

## Framework Integration

### Next.js API Route

```typescript
// app/api/chat/route.ts
import { OpenAI } from 'openai';
import { initLumina } from '@lumina/sdk';

const openai = new OpenAI();
const lumina = initLumina({
  apiKey: process.env.LUMINA_API_KEY,
});

export async function POST(req: Request) {
  const { message } = await req.json();

  const response = await lumina.trace(
    async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
      });
    },
    {
      name: '/api/chat',
      tags: ['nextjs', 'chat'],
    }
  );

  return Response.json(response);
}
```

### Express.js

```typescript
import express from 'express';
import { OpenAI } from 'openai';
import { initLumina } from '@lumina/sdk';

const app = express();
const openai = new OpenAI();
const lumina = initLumina({
  apiKey: process.env.LUMINA_API_KEY,
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  const response = await lumina.trace(
    async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
      });
    },
    {
      name: '/api/chat',
      metadata: {
        userId: req.user?.id,
      },
    }
  );

  res.json(response);
});
```

## API Reference

### `initLumina(config?)`

Initialize the Lumina SDK.

**Parameters:**
- `config` (optional): SDK configuration object

**Returns:** `Lumina` instance

### `lumina.trace(fn, options?)`

Trace an async function that makes LLM calls.

**Parameters:**
- `fn`: Async function to trace
- `options` (optional):
  - `name`: Endpoint or operation name
  - `tags`: Array of tags
  - `metadata`: Additional metadata object

**Returns:** Promise resolving to the function's return value

### `lumina.createTrace(data)`

Manually create a trace.

**Parameters:**
- `data`: Trace data object
  - `prompt`: Input prompt
  - `response`: LLM response
  - `model`: Model name
  - `tokens`: Total tokens used
  - `latency_ms`: Latency in milliseconds
  - `cost_usd`: Cost in USD
  - `metadata` (optional): Additional metadata
  - `tags` (optional): Array of tags

### `lumina.flush()`

Flush all pending traces immediately.

**Returns:** Promise that resolves when flush is complete

### `lumina.shutdown()`

Shutdown the SDK and flush remaining traces.

**Returns:** Promise that resolves when shutdown is complete

### `lumina.isEnabled()`

Check if SDK is enabled.

**Returns:** Boolean

## Best Practices

1. **Initialize once**: Create a single Lumina instance and reuse it
2. **Use environment variables**: Store your API key in environment variables
3. **Add metadata**: Include user IDs, session IDs for better debugging
4. **Tag appropriately**: Use tags to categorize traces (production, staging, etc.)
5. **Flush on exit**: Call `shutdown()` on process exit to avoid losing traces
6. **Disable in development**: Set `enabled: false` in local development if desired

## Troubleshooting

### Traces not appearing in dashboard

1. Check your API key is correct
2. Verify the endpoint URL is correct
3. Check network connectivity
4. Look for errors in console: `[Lumina SDK] ...`

### High latency

1. Increase `batchSize` to send traces less frequently
2. Increase `batchIntervalMs` to wait longer between sends
3. Check your network connection to the ingestion endpoint

### Missing traces

1. Call `lumina.flush()` before process exits
2. Use `lumina.shutdown()` on SIGTERM/SIGINT
3. Check that `enabled` is `true`

## Support

- Documentation: https://docs.lumina.app
- Issues: https://github.com/lumina/lumina/issues
- Email: support@lumina.app

## License

MIT