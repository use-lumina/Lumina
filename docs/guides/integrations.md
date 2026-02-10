# Lumina Integration Guides

This guide shows you how to integrate Lumina with popular LLM providers and frameworks.

## Table of Contents

- [OpenAI](#openai)
- [Anthropic (Claude)](#anthropic-claude)
- [LangChain](#langchain)
- [Vercel AI SDK](#vercel-ai-sdk)
- [Next.js / React](#nextjs--react)
- [Express / Node.js](#express--nodejs)

---

## Quick Start

All integrations follow the same pattern:

```typescript
import { Lumina } from '@uselumina/sdk';

// Initialize Lumina (no API key needed for self-hosted!)
const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
  serviceName: 'my-app',
  environment: 'production',
});

// Wrap your LLM call
const response = await lumina.traceLLM(
  async () => {
    return await yourLLMCall();
  },
  {
    name: 'operation-name',
    provider: 'openai', // or 'anthropic', 'cohere', etc.
    model: 'gpt-4',
    prompt: 'Your prompt here',
  }
);
```

---

## OpenAI

### Installation

```bash
npm install openai @uselumina/sdk
# or
bun add openai @uselumina/sdk
```

### Basic Example

```typescript
import OpenAI from 'openai';
import { Lumina } from '@uselumina/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
  serviceName: 'my-app',
});

// Chat Completions
const response = await lumina.traceLLM(
  async () => {
    return await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the capital of France?' },
      ],
      temperature: 0.7,
    });
  },
  {
    name: 'chat-completion',
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'What is the capital of France?',
    tags: ['chat', 'geography'],
  }
);

const reply = response.choices[0]?.message?.content;
console.log(reply);
```

### Streaming Example

```typescript
const stream = await lumina.traceLLM(
  async () => {
    return await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Tell me a story' }],
      stream: true,
    });
  },
  {
    name: 'stream-chat',
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'Tell me a story',
  }
);

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}
```

### Embeddings

```typescript
const embeddings = await lumina.traceLLM(
  async () => {
    return await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'The quick brown fox jumps over the lazy dog',
    });
  },
  {
    name: 'create-embedding',
    provider: 'openai',
    model: 'text-embedding-3-small',
    prompt: 'The quick brown fox jumps over the lazy dog',
    tags: ['embeddings'],
  }
);
```

**Full Example:** See [examples/openai-basic](../../examples/openai-basic)

---

## Anthropic (Claude)

### Installation

```bash
npm install @anthropic-ai/sdk @uselumina/sdk
# or
bun add @anthropic-ai/sdk @uselumina/sdk
```

### Basic Example

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Lumina } from '@uselumina/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
  serviceName: 'my-app',
});

// Messages API
const response = await lumina.traceLLM(
  async () => {
    return await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'What is the capital of France?' }],
    });
  },
  {
    name: 'chat-completion',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    prompt: 'What is the capital of France?',
    tags: ['chat', 'geography'],
  }
);

const reply = response.content[0]?.type === 'text' ? response.content[0].text : 'No response';
console.log(reply);
```

### With System Prompt

```typescript
const response = await lumina.traceLLM(
  async () => {
    return await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: 'You are an expert in European geography.',
      messages: [{ role: 'user', content: 'What is the capital of France?' }],
    });
  },
  {
    name: 'chat-with-system',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    prompt: 'What is the capital of France?',
    metadata: {
      system_prompt: 'You are an expert in European geography.',
    },
  }
);
```

### Streaming Example

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
  if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
    process.stdout.write(chunk.delta.text);
  }
}
```

**Full Example:** See [examples/anthropic-basic](../../examples/anthropic-basic)

---

## LangChain

### Installation

```bash
npm install langchain @langchain/openai @uselumina/sdk
# or
bun add langchain @langchain/openai @uselumina/sdk
```

### Basic Example

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { Lumina } from '@uselumina/sdk';

const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
  serviceName: 'langchain-app',
});

const chat = new ChatOpenAI({
  modelName: 'gpt-4',
  temperature: 0.7,
});

// Wrap the LangChain call
const response = await lumina.traceLLM(
  async () => {
    return await chat.invoke([new HumanMessage('What is the capital of France?')]);
  },
  {
    name: 'langchain-chat',
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'What is the capital of France?',
    tags: ['langchain', 'chat'],
  }
);

console.log(response.content);
```

### With Chains

```typescript
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';

const prompt = PromptTemplate.fromTemplate('What is the capital of {country}?');

const chain = new LLMChain({ llm: chat, prompt });

const response = await lumina.traceLLM(
  async () => {
    return await chain.call({ country: 'France' });
  },
  {
    name: 'langchain-chain',
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'What is the capital of France?',
    tags: ['langchain', 'chain'],
    metadata: {
      chain_type: 'LLMChain',
      country: 'France',
    },
  }
);
```

---

## Vercel AI SDK

### Installation

```bash
npm install ai @uselumina/sdk
# or
bun add ai @uselumina/sdk
```

### Basic Example

```typescript
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { Lumina } from '@uselumina/sdk';

const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
  serviceName: 'vercel-ai-app',
});

const response = await lumina.traceLLM(
  async () => {
    return await generateText({
      model: openai('gpt-4'),
      prompt: 'What is the capital of France?',
    });
  },
  {
    name: 'vercel-ai-generate',
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'What is the capital of France?',
    tags: ['vercel-ai'],
  }
);

console.log(response.text);
```

### Streaming UI

```typescript
import { streamUI } from 'ai/rsc';
import { openai } from '@ai-sdk/openai';

const result = await lumina.traceLLM(
  async () => {
    return await streamUI({
      model: openai('gpt-4'),
      prompt: 'Generate a list of items',
    });
  },
  {
    name: 'stream-ui',
    provider: 'openai',
    model: 'gpt-4',
    prompt: 'Generate a list of items',
    tags: ['vercel-ai', 'streaming'],
  }
);
```

---

## Next.js / React

### API Route Example

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Lumina } from '@uselumina/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const lumina = new Lumina({
  endpoint: process.env.LUMINA_ENDPOINT || 'http://localhost:8080/v1/traces',
  serviceName: 'nextjs-api',
});

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const response = await lumina.traceLLM(
    async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
      });
    },
    {
      name: '/api/chat',
      provider: 'openai',
      model: 'gpt-4',
      prompt: message,
      tags: ['nextjs', 'api-route'],
    }
  );

  return NextResponse.json({
    reply: response.choices[0]?.message?.content,
  });
}
```

### Server Action Example

```typescript
// app/actions/chat.ts
'use server';

import OpenAI from 'openai';
import { Lumina } from '@uselumina/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const lumina = new Lumina({
  endpoint: process.env.LUMINA_ENDPOINT || 'http://localhost:8080/v1/traces',
  serviceName: 'nextjs-actions',
});

export async function chatAction(message: string) {
  const response = await lumina.traceLLM(
    async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
      });
    },
    {
      name: 'chat-action',
      provider: 'openai',
      model: 'gpt-4',
      prompt: message,
      tags: ['nextjs', 'server-action'],
    }
  );

  return response.choices[0]?.message?.content || 'No response';
}
```

**Full Example:** See [examples/nextjs-rag](../../examples/nextjs-rag)

---

## Express / Node.js

### Basic Example

```typescript
import express from 'express';
import OpenAI from 'openai';
import { Lumina } from '@uselumina/sdk';

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const lumina = new Lumina({
  endpoint: process.env.LUMINA_ENDPOINT || 'http://localhost:8080/v1/traces',
  serviceName: 'express-api',
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await lumina.traceLLM(
      async () => {
        return await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: message }],
        });
      },
      {
        name: 'POST /api/chat',
        provider: 'openai',
        model: 'gpt-4',
        prompt: message,
        tags: ['express', 'api'],
        metadata: {
          userId: req.headers['user-id'],
        },
      }
    );

    res.json({
      reply: response.choices[0]?.message?.content,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## Configuration Options

### Lumina Constructor

```typescript
const lumina = new Lumina({
  // Required for managed cloud, optional for self-hosted
  apiKey: 'lumina_customer_abc...',

  // Ingestion endpoint (default: http://localhost:8080/v1/traces)
  endpoint: 'http://localhost:8080/v1/traces',

  // Service name (identifies your app in traces)
  serviceName: 'my-app',

  // Environment (live, staging, development, test)
  environment: 'production',

  // Optional: Customer ID for multi-tenant scenarios
  customerId: 'customer-123',

  // Optional: Batch size (default: 10)
  batchSize: 10,

  // Optional: Flush interval in milliseconds (default: 5000)
  flushIntervalMs: 5000,

  // Optional: Request timeout in milliseconds (default: 30000)
  timeoutMs: 30000,
});
```

### Trace Options

```typescript
await lumina.traceLLM(
  async () => {
    /* your LLM call */
  },
  {
    // Required: Operation name
    name: 'chat-completion',

    // Required: Provider (openai, anthropic, cohere, etc.)
    provider: 'openai',

    // Required: Model name
    model: 'gpt-4',

    // Required: The prompt/input
    prompt: 'What is the capital of France?',

    // Optional: Tags for filtering
    tags: ['chat', 'geography'],

    // Optional: Custom metadata
    metadata: {
      userId: 'user-123',
      sessionId: 'session-456',
      temperature: 0.7,
    },
  }
);
```

---

## Best Practices

### 1. Use Meaningful Names

```typescript
// ❌ Bad
{ name: 'llm-call' }

// ✅ Good
{ name: 'summarize-document', tags: ['summarization'] }
{ name: 'extract-entities', tags: ['ner', 'extraction'] }
{ name: 'generate-response', tags: ['chat', 'customer-support'] }
```

### 2. Add Context with Tags

```typescript
// ✅ Good - easy to filter later
{
  name: 'chat-completion',
  tags: ['production', 'customer-support', 'high-priority'],
  metadata: {
    userId: 'user-123',
    ticketId: 'ticket-456',
  },
}
```

### 3. Track Costs

Lumina automatically calculates costs based on token usage, but you can override:

```typescript
{
  name: 'custom-model',
  metadata: {
    costUsd: 0.05, // Override automatic calculation
  },
}
```

### 4. Error Handling

```typescript
try {
  const response = await lumina.traceLLM(
    async () => {
      return await openai.chat.completions.create({...});
    },
    { name: 'chat', provider: 'openai', model: 'gpt-4', prompt: '...' }
  );
} catch (error) {
  // Lumina captures the error automatically
  console.error('LLM call failed:', error);
  throw error;
}
```

---

## Next Steps

- 🚨 [Set Up Alerts](./ALERTS.md) - Get notified of cost spikes and quality drops
- 🔁 [Use Replay](./replay.md) - Test prompt changes safely
- 📊 [View Your Traces](http://localhost:3000/traces) - Explore the dashboard
- 📖 [API Reference](../api/API_REFERENCE.md) - Full SDK documentation

---

## Need Help?

- 💬 [GitHub Discussions](https://github.com/use-lumina/Lumina/discussions)
- 🐛 [Report an Issue](https://github.com/use-lumina/Lumina/issues)
- 📖 [Read the Docs](https://use-lumina.github.io/Lumina)
