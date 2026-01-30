# @uselumina/sdk

Official TypeScript/JavaScript SDK for Lumina - The OpenTelemetry-native AI Observability Platform.

## Installation

```bash
npm install @uselumina/sdk
# or
bun add @uselumina/sdk
# or
yarn add @uselumina/sdk
```

## Quick Start

### 1. Initialize the SDK

```typescript
import { initLumina } from '@uselumina/sdk';

const lumina = initLumina({
  // For self-hosted, point to your collector endpoint
  endpoint: 'http://localhost:9411/v1/traces',
  service_name: 'my-awesome-app',

  // For Lumina Cloud, an API key is required
  // apiKey: process.env.LUMINA_API_KEY,
});
```

### 2. Trace a Single LLM Call

Use `lumina.traceLLM` to automatically instrument an LLM call. It captures the prompt, response, model, token usage, latency, and calculates the cost for you.

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI();

// Wrap your LLM calls with lumina.traceLLM()
const response = await lumina.traceLLM(
  () =>
    openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello, world!' }],
    }),
  {
    name: 'intro-chat',
    system: 'openai', // Helps with precise cost calculation
    prompt: 'Hello, world!', // Optional: provide prompt for immediate capture
    metadata: {
      userId: 'user-123',
    },
  }
);

console.log('✅ Trace sent to Lumina!', response.choices[0].message);
```

That's it! Your LLM calls are now being tracked with rich, AI-specific metadata.

---

## Hierarchical (Multi-Span) Tracing

Modern AI applications are complex pipelines. Use `lumina.trace()` to create a **parent span** for an entire workflow, like a RAG pipeline. Any `traceLLM` calls inside it will automatically become **child spans**.

This gives you a complete end-to-end view, helping you find bottlenecks and attribute costs.

```typescript
// Trace a complex RAG operation with a parent span
const answer = await lumina.trace('rag_request', async (parentSpan) => {
  parentSpan.setAttribute('user_query', 'What is multi-span tracing?');

  // 1. First child operation: retrieval
  const documents = await lumina.trace('retrieval', async () => {
    return await retrieveDocuments(query);
  });
  parentSpan.addEvent('Retrieved documents');

  // 2. Second child operation: synthesis (nested LLM call)
  // This traceLLM call will automatically be a child of 'rag_request'
  const response = await lumina.traceLLM(
    () =>
      openai.chat.completions.create({
        model: 'claude-3-sonnet',
        messages: [{ role: 'user', content: createPrompt(query, documents) }],
      }),
    { name: 'synthesis', system: 'anthropic' }
  );

  return response.choices[0].message.content;
});
```

---

## Framework Integration

### Next.js API Route

```typescript
// app/api/chat/route.ts
import { OpenAI } from 'openai';
import { initLumina } from '@uselumina/sdk';

const openai = new OpenAI();
const lumina = initLumina({ service_name: 'nextjs-app' });

export async function POST(req: Request) {
  const { message } = await req.json();

  // The 'trace' method creates a parent span for the entire request
  const response = await lumina.trace('POST /api/chat', async () => {
    return await lumina.traceLLM(
      () =>
        openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: message }],
        }),
      { system: 'openai' }
    );
  });

  return Response.json(response);
}
```

---

## API Reference

### `initLumina(config?)`

Initializes and returns a singleton `Lumina` instance.

- `config` (optional): `SdkConfig` object for programmatic configuration (e.g., `endpoint`, `apiKey`, `service_name`).

### `lumina.trace(name, fn)`

Traces a block of code as a parent span, enabling hierarchical traces.

- `name`: A name for the operation (e.g., `rag_pipeline`, `POST /api/chat`).
- `fn`: An async function `(span: Span) => Promise<T>` to execute within the trace. The `span` object is the OpenTelemetry span, which you can use to add custom attributes or events.

### `lumina.traceLLM(fn, options?)`

A convenience wrapper to trace a single LLM API call with automatic attribute extraction (cost, tokens, etc.).

- `fn`: An async function that returns the LLM provider's response object.
- `options` (optional):
  - `name`: A descriptive name for the call (e.g., `summarize_document`).
  - `system`: The provider used (e.g., `openai`, `anthropic`). Helps with cost calculation.
  - `prompt`: The prompt string.
  - `metadata`: A key-value object for custom data (e.g., `userId`).
  - `tags`: An array of string tags.

### `lumina.flush()`

Forces an immediate upload of all buffered spans.

### `lumina.shutdown()`

Flushes all buffered spans and gracefully shuts down the SDK. Call this before your application exits.

---

## Best Practices

1.  **Initialize once**: Create a single `Lumina` instance and reuse it throughout your application.
2.  **Use Parent Spans**: Wrap your business logic (e.g., API request handlers, complex functions) in a `lumina.trace()` block to create parent spans.
3.  **Add Metadata**: Use the `metadata` option or `span.setAttribute()` to include `userId`, `sessionId`, or other useful context for debugging.
4.  **Flush on Exit**: Call `lumina.shutdown()` on `SIGTERM`/`SIGINT` to prevent losing traces from a terminating process.
5.  **Disable in Development**: Set `enabled: false` in your local development environment if you don't need to trace every call.

## Troubleshooting

- **Traces not appearing?** Verify your `endpoint` URL is correct and reachable. Check for any console errors from the SDK.
- **Missing traces on exit?** Ensure you are calling `await lumina.shutdown()` before the process terminates.
