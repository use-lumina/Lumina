# Lumina SDK - Next.js RAG Example

This example demonstrates how to use `@uselumina/sdk` to track LLM calls in a Next.js application.

## Setup

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your OPENAI_API_KEY
   ```

3. **Build the SDK packages** (from monorepo root):

   ```bash
   cd ../..
   bun run --filter @lumina/schema build
   bun run --filter @lumina/config build
   bun run --filter @uselumina/sdk build
   cd examples/nextjs-rag
   ```

4. **Run the development server:**

   ```bash
   bun run dev
   ```

5. **Open http://localhost:3000** in your browser

## What to Test

1. **Open browser console** (F12) to see SDK logs
2. **Send a chat message** - The SDK will capture the OpenAI call
3. **Check console for:**
   - `[Lumina SDK]` logs showing trace capture
   - Trace IDs (e.g., `trace_lx8w9_abc123`)
   - Batch flushing attempts

## Expected Behavior

Since the ingestion service isn't running yet, you'll see:

- ✅ SDK captures traces
- ✅ Batches them (up to 10 traces or 5 seconds)
- ❌ Fails to send to `localhost:8080` (expected!)
- ✅ Retries with exponential backoff
- ⚠️ Logs errors after 3 failed attempts

**This is normal!** The SDK is working correctly - it just can't reach the backend yet.

## How It Works

```typescript
// app/api/chat/route.ts
const lumina = initLumina({
  api_key: process.env.LUMINA_API_KEY,
  environment: 'test',
});

// Wrap any LLM call
const response = await lumina.trace(async () => {
  return await openai.chat.completions.create({...});
});
```

The SDK automatically captures:

- ✅ Prompt and response
- ✅ Tokens used
- ✅ Latency
- ✅ Cost (estimated)
- ✅ Model information
- ✅ Error states

## Troubleshooting

**No traces captured:**

- Check `LUMINA_ENABLED=true` in `.env.local`
- Verify SDK is initialized (check for `[Lumina SDK]` logs)

**OpenAI errors:**

- Verify `OPENAI_API_KEY` is set correctly
- Check your OpenAI account has credits

**Build errors:**

- Make sure all workspace packages are built first
- Try `bun install` from the monorepo root
