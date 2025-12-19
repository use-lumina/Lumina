# Multi-Span Tracing Guide

Learn how to create parent-child span hierarchies to trace complex AI workflows with Lumina.

## What are Spans?

A **span** represents a single operation in your application:
- An LLM API call
- A vector database query
- A function execution
- An HTTP request

A **trace** is a collection of spans that represents a complete request flow.

## Why Use Multi-Span Tracing?

Complex AI applications have multiple steps:

```
User Request
  ├─ Input validation
  ├─ Vector search (retrieval)
  │   ├─ Generate embedding
  │   └─ Query Pinecone
  ├─ LLM generation
  │   ├─ Build prompt
  │   └─ Call Claude API
  └─ Response formatting
```

**Benefits:**
- 🔍 **Pinpoint bottlenecks**: Which step is slow?
- 💰 **Track costs**: How much does each step cost?
- 🐛 **Debug failures**: Which step failed?
- 📊 **Understand flow**: Visualize request execution

---

## Basic Multi-Span Pattern

### Parent Span with Children

```typescript
import { initLumina } from '@lumina/sdk';

const lumina = initLumina({
  api_key: process.env.LUMINA_API_KEY,
});

async function processRequest(input: string) {
  // Parent span: Wraps entire operation
  return await lumina.trace(async () => {

    // Child span 1: Validation
    const validated = await lumina.trace(async () => {
      return validateInput(input);
    }, {
      name: 'input-validation',
      attributes: {
        'input.length': input.length,
      }
    });

    // Child span 2: Processing
    const processed = await lumina.trace(async () => {
      return processData(validated);
    }, {
      name: 'data-processing',
    });

    // Child span 3: LLM call
    const result = await lumina.trace(async () => {
      return await llm.generate(processed);
    }, {
      name: 'llm-generation',
    });

    return result;
  }, {
    name: 'process-request', // Parent span name
    attributes: {
      'request.id': generateId(),
      'request.type': 'user-query',
    }
  });
}
```

### What You See in Lumina

```
📊 process-request (total: 2.1s, cost: $0.015)
  ├─ input-validation (50ms, $0)
  ├─ data-processing (100ms, $0)
  └─ llm-generation (1.95s, $0.015)
      ├─ Model: claude-3-5-sonnet
      ├─ Tokens: 1,245
      └─ Cost: $0.015
```

---

## Real-World Patterns

### Pattern 1: Sequential Operations

When steps must happen in order:

```typescript
async function chatbot(message: string) {
  return await lumina.trace(async () => {

    // Step 1: Classify intent
    const intent = await lumina.trace(async () => {
      return await classifyIntent(message);
    }, { name: 'intent-classification' });

    // Step 2: Retrieve context (based on intent)
    const context = await lumina.trace(async () => {
      return await fetchContext(intent);
    }, { name: 'context-retrieval' });

    // Step 3: Generate response
    const response = await lumina.trace(async () => {
      return await generateResponse(message, context);
    }, { name: 'response-generation' });

    return response;
  }, { name: 'chatbot-request' });
}
```

### Pattern 2: Parallel Operations

When steps can run concurrently:

```typescript
async function multiModelInference(input: string) {
  return await lumina.trace(async () => {

    // Run multiple models in parallel
    const [gpt4Result, claudeResult, mistralResult] = await Promise.all([
      lumina.trace(() => callGPT4(input), { name: 'gpt4-inference' }),
      lumina.trace(() => callClaude(input), { name: 'claude-inference' }),
      lumina.trace(() => callMistral(input), { name: 'mistral-inference' }),
    ]);

    // Aggregate results
    const final = await lumina.trace(async () => {
      return aggregateResults([gpt4Result, claudeResult, mistralResult]);
    }, { name: 'result-aggregation' });

    return final;
  }, { name: 'multi-model-inference' });
}
```

### Pattern 3: Nested Hierarchies

When operations have multiple levels:

```typescript
async function complexWorkflow(query: string) {
  return await lumina.trace(async () => {

    // Level 1: Research phase
    const research = await lumina.trace(async () => {

      // Level 2: Multiple research sources
      const webSearch = await lumina.trace(() => searchWeb(query), {
        name: 'web-search'
      });

      const dbLookup = await lumina.trace(() => queryDatabase(query), {
        name: 'database-lookup'
      });

      return { webSearch, dbLookup };
    }, { name: 'research-phase' });

    // Level 1: Analysis phase
    const analysis = await lumina.trace(async () => {

      // Level 2: Analyze each source
      const webAnalysis = await lumina.trace(() => analyzeWeb(research.webSearch), {
        name: 'web-analysis'
      });

      const dbAnalysis = await lumina.trace(() => analyzeDB(research.dbLookup), {
        name: 'db-analysis'
      });

      return { webAnalysis, dbAnalysis };
    }, { name: 'analysis-phase' });

    // Level 1: Synthesis
    const final = await lumina.trace(async () => {
      return synthesize(analysis);
    }, { name: 'synthesis-phase' });

    return final;
  }, { name: 'complex-workflow' });
}
```

---

## Best Practices

### 1. Name Spans Clearly

```typescript
// ✅ Good: Clear, descriptive names
{ name: 'user-auth-verification' }
{ name: 'product-recommendation-llm' }
{ name: 'payment-processing' }

// ❌ Bad: Vague names
{ name: 'step1' }
{ name: 'process' }
{ name: 'do-stuff' }
```

### 2. Add Rich Attributes

```typescript
// ✅ Good: Useful debugging context
{
  name: 'user-query',
  attributes: {
    'user.id': userId,
    'user.plan': 'enterprise',
    'query.type': 'product-search',
    'query.filters': JSON.stringify(filters),
  }
}

// ❌ Bad: No context
{ name: 'query' }
```

### 3. Keep Hierarchy Shallow

```typescript
// ✅ Good: 2-3 levels max
Parent
  ├─ Child 1
  ├─ Child 2
  └─ Child 3

// ❌ Bad: Too deep
Parent
  └─ Child
      └─ Grandchild
          └─ Great-grandchild
              └─ Great-great-grandchild (hard to visualize)
```

### 4. Group Related Operations

```typescript
// ✅ Good: Logical grouping
lumina.trace(async () => {
  await lumina.trace(embeddingStep, { name: 'embedding' });
  await lumina.trace(vectorSearch, { name: 'search' });
  await lumina.trace(reranking, { name: 'rerank' });
}, { name: 'retrieval-phase' }); // Groups retrieval steps

// ❌ Bad: Flat structure
await lumina.trace(embeddingStep);
await lumina.trace(vectorSearch);
await lumina.trace(reranking);
```

### 5. Use Consistent Naming Conventions

```typescript
// ✅ Good: Consistent prefixes
'rag-retrieval'
'rag-generation'
'rag-reranking'

'auth-login'
'auth-verify'
'auth-refresh'

// ❌ Bad: Inconsistent
'retrieve_data'
'GenerateResponse'
'reRanking'
```

---

## Advanced Patterns

### Pattern: Error Handling Spans

```typescript
async function robustWorkflow(input: string) {
  return await lumina.trace(async () => {

    let result;
    try {
      result = await lumina.trace(async () => {
        return await primaryModel(input);
      }, { name: 'primary-model' });
    } catch (error) {
      // Fallback span
      result = await lumina.trace(async () => {
        return await fallbackModel(input);
      }, {
        name: 'fallback-model',
        attributes: {
          'fallback.reason': error.message,
        }
      });
    }

    return result;
  }, { name: 'robust-workflow' });
}
```

### Pattern: Conditional Spans

```typescript
async function smartCaching(query: string) {
  return await lumina.trace(async () => {

    // Check cache first
    const cached = await lumina.trace(async () => {
      return await cache.get(query);
    }, {
      name: 'cache-lookup',
      attributes: { 'cache.key': query }
    });

    if (cached) {
      // Cache hit: no LLM call needed
      return cached;
    }

    // Cache miss: LLM call span
    const result = await lumina.trace(async () => {
      return await llm.generate(query);
    }, {
      name: 'llm-generation',
      attributes: { 'cache.hit': false }
    });

    // Store in cache span
    await lumina.trace(async () => {
      await cache.set(query, result);
    }, { name: 'cache-store' });

    return result;
  }, { name: 'smart-caching-request' });
}
```

### Pattern: Loop Spans

```typescript
async function batchProcessing(items: string[]) {
  return await lumina.trace(async () => {

    const results = [];

    for (let i = 0; i < items.length; i++) {
      const result = await lumina.trace(async () => {
        return await processItem(items[i]);
      }, {
        name: 'process-item',
        attributes: {
          'item.index': i,
          'item.id': items[i],
        }
      });

      results.push(result);
    }

    return results;
  }, {
    name: 'batch-processing',
    attributes: {
      'batch.size': items.length,
    }
  });
}
```

---

## Debugging with Multi-Span Traces

### Find the Bottleneck

```typescript
// Your trace shows:
📊 api-request (total: 3.2s)
  ├─ auth-check (50ms)
  ├─ data-fetch (150ms)
  ├─ vector-search (2.8s) ⚠️ SLOW!
  └─ format-response (200ms)

// Action: Optimize vector search!
```

### Track Cost Distribution

```typescript
// Your trace shows:
📊 rag-pipeline (total cost: $0.025)
  ├─ retrieval ($0.001) 4%
  └─ generation ($0.024) 96%

// Insight: Generation is 96% of cost, focus there!
```

### Debug Failures

```typescript
// Your trace shows:
📊 user-request (FAILED)
  ├─ validate-input ✅
  ├─ fetch-user-data ✅
  ├─ call-llm ❌ Error: Rate limit exceeded
  └─ send-response (skipped)

// Problem: LLM rate limit hit in 3rd step
```

---

## Integration with Lumina Features

### Alerts on Child Spans

Set up alerts for specific steps:

```typescript
// Alert when vector search is slow
if (vectorSearchLatency > 2000ms) {
  alert('Vector search slow');
}

// Alert when LLM costs spike
if (llmCost > baseline * 1.5) {
  alert('LLM cost spike');
}
```

### Replay with Multi-Span Traces

Test improvements on specific steps:

```typescript
// Original: 5 documents retrieved
'rag-retrieval': { topK: 5 }

// Test: 10 documents with reranking
'rag-retrieval': { topK: 10, rerank: true, finalK: 5 }

// Compare:
// - Which retrieval strategy is better?
// - Does reranking improve quality?
// - What's the cost tradeoff?
```

---

## Common Mistakes

### Mistake 1: Too Many Spans

```typescript
// ❌ Bad: Span for every tiny operation
await lumina.trace(validateEmail);
await lumina.trace(trimWhitespace);
await lumina.trace(toLowerCase);
await lumina.trace(checkFormat);

// ✅ Good: Group into one span
await lumina.trace(validateAndNormalizeInput, {
  name: 'input-validation'
});
```

### Mistake 2: Missing Parent Span

```typescript
// ❌ Bad: No parent span
await lumina.trace(step1);
await lumina.trace(step2);
await lumina.trace(step3);
// Hard to see they're related!

// ✅ Good: Parent span groups them
await lumina.trace(async () => {
  await lumina.trace(step1, { name: 'step1' });
  await lumina.trace(step2, { name: 'step2' });
  await lumina.trace(step3, { name: 'step3' });
}, { name: 'workflow' });
```

### Mistake 3: Inconsistent Nesting

```typescript
// ❌ Bad: Inconsistent structure
// Sometimes flat, sometimes nested
await lumina.trace(action1);
await lumina.trace(async () => {
  await lumina.trace(action2);
}, { name: 'parent' });

// ✅ Good: Consistent structure
await lumina.trace(async () => {
  await lumina.trace(action1, { name: 'action1' });
  await lumina.trace(action2, { name: 'action2' });
}, { name: 'workflow' });
```

---

## Performance Tips

### 1. Don't Over-Instrument

```typescript
// ❌ Bad: Tracing trivial operations
await lumina.trace(() => x + y, { name: 'add' });
await lumina.trace(() => Math.max(a, b), { name: 'max' });

// ✅ Good: Only trace meaningful operations
await lumina.trace(() => fetchFromAPI(), { name: 'api-call' });
await lumina.trace(() => llm.generate(), { name: 'llm-call' });
```

### 2. Batch Attributes

```typescript
// ✅ Good: Set all attributes at once
{
  name: 'process',
  attributes: {
    'user.id': userId,
    'user.plan': plan,
    'request.type': type,
  }
}

// ❌ Bad: Multiple API calls
// (not supported, but conceptually)
```

### 3. Use Async Properly

```typescript
// ✅ Good: Await properly
const result = await lumina.trace(async () => {
  return await asyncOperation();
}, { name: 'operation' });

// ❌ Bad: Missing await
const result = lumina.trace(async () => {
  return await asyncOperation();
}, { name: 'operation' });
// Span might not complete!
```

---

## Next Steps

- ✅ Implement multi-span tracing in your app
- 📊 Visualize traces in Lumina dashboard
- 🔔 Set up alerts for slow spans
- 🔄 Use replay to test optimizations

**Need help?** Check out:
- [RAG integration guide](./rag-integration.md)
- [AI pipeline best practices](./ai-pipeline-best-practices.md)
- [API reference](/docs/api/API_REFERENCE.md)