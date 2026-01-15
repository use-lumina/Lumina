# RAG System Integration Guide

This guide shows you how to instrument Retrieval-Augmented Generation (RAG) systems with Lumina to get full observability across your entire pipeline.

## What is RAG?

RAG (Retrieval-Augmented Generation) systems combine:

1. **Retrieval**: Searching a knowledge base (vector database) for relevant context
2. **Generation**: Using an LLM to generate a response based on the retrieved context

## Why Instrument RAG with Lumina?

RAG pipelines have unique observability challenges:

- **Two cost components**: Vector search + LLM generation
- **Quality issues**: Wrong context retrieved OR LLM ignores context
- **Performance bottlenecks**: Slow retrieval OR slow generation
- **Context bloat**: Too much context = higher costs + lower quality

Lumina helps you:

- ✅ Track costs for both retrieval and generation
- ✅ Detect when context quality degrades
- ✅ Alert when context length grows unexpectedly
- ✅ Compare RAG pipeline versions (prompt changes, retrieval strategies)

---

## Basic RAG Instrumentation

### Setup

```bash
# Install Lumina SDK
npm install @lumina/sdk

# Install your RAG dependencies
npm install @pinecone-database/pinecone @anthropic-ai/sdk
```

### Simple RAG Example

```typescript
import { initLumina } from '@lumina/sdk';
import { Pinecone } from '@pinecone-database/pinecone';
import Anthropic from '@anthropic-ai/sdk';

const lumina = initLumina({
  api_key: process.env.LUMINA_API_KEY,
  environment: 'production',
});

const pinecone = new Pinecone();
const anthropic = new Anthropic();

export async function answerQuestion(question: string) {
  // Lumina creates ONE parent trace for the entire RAG flow
  return await lumina.trace(
    async () => {
      // Step 1: Retrieval (child span)
      const context = await lumina.trace(
        async () => {
          const embedding = await getEmbedding(question);

          const results = await pinecone.index('knowledge-base').query({
            vector: embedding,
            topK: 5,
            includeMetadata: true,
          });

          return results.matches.map((m) => m.metadata?.text).join('\n\n');
        },
        {
          name: 'rag-retrieval',
          attributes: {
            'rag.query': question,
            'rag.num_results': 5,
            'rag.vector_db': 'pinecone',
            'rag.index': 'knowledge-base',
          },
        }
      );

      // Step 2: Generation (child span)
      const response = await lumina.trace(
        async () => {
          return await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: `Use the following context to answer the question.

Context:
${context}

Question: ${question}

Answer:`,
              },
            ],
          });
        },
        {
          name: 'rag-generation',
          attributes: {
            'rag.context_length': context.length,
            'rag.context_tokens': Math.ceil(context.length / 4), // rough estimate
          },
        }
      );

      return response.content[0].text;
    },
    {
      name: 'rag-pipeline',
      attributes: {
        'rag.type': 'simple',
        'rag.version': '1.0',
      },
    }
  );
}
```

### What You'll See in Lumina

```
📊 RAG Pipeline (total: 1.2s, cost: $0.016)
  ├─ 🔍 rag-retrieval (850ms, $0.001)
  │   ├─ Query: "What is the capital of France?"
  │   ├─ Results: 5 documents
  │   └─ Vector DB: Pinecone
  └─ ✍️  rag-generation (350ms, $0.015)
      ├─ Model: claude-3-5-sonnet
      ├─ Context: 1,245 tokens
      └─ Response: 87 tokens
```

---

## Advanced RAG Patterns

### Multi-Hop RAG

When your RAG system does multiple retrieval rounds:

```typescript
export async function multiHopRAG(question: string) {
  return await lumina.trace(
    async () => {
      // Hop 1: Initial retrieval
      const initialContext = await lumina.trace(
        async () => {
          // ... retrieval logic
        },
        {
          name: 'rag-retrieval-hop-1',
          attributes: { 'rag.hop': 1 },
        }
      );

      // Hop 2: Query refinement
      const refinedQuery = await lumina.trace(
        async () => {
          // Use LLM to refine query based on initial context
          return await refineQuery(question, initialContext);
        },
        {
          name: 'rag-query-refinement',
        }
      );

      // Hop 3: Second retrieval with refined query
      const refinedContext = await lumina.trace(
        async () => {
          // ... retrieval logic with refinedQuery
        },
        {
          name: 'rag-retrieval-hop-2',
          attributes: { 'rag.hop': 2 },
        }
      );

      // Final generation
      const response = await lumina.trace(
        async () => {
          // ... generation logic
        },
        { name: 'rag-generation' }
      );

      return response;
    },
    { name: 'rag-multi-hop-pipeline' }
  );
}
```

### RAG with Reranking

```typescript
export async function ragWithReranking(question: string) {
  return await lumina.trace(async () => {

    // Initial retrieval (broad)
    const candidates = await lumina.trace(async () => {
      return await vectorSearch(question, topK: 20);
    }, {
      name: 'rag-retrieval-candidates',
      attributes: { 'rag.candidates': 20 }
    });

    // Reranking
    const reranked = await lumina.trace(async () => {
      return await rerank(question, candidates, topK: 5);
    }, {
      name: 'rag-reranking',
      attributes: {
        'rag.reranker': 'cohere',
        'rag.final_count': 5
      }
    });

    // Generation with top results
    const response = await lumina.trace(async () => {
      // ... generation logic
    }, {
      name: 'rag-generation',
      attributes: { 'rag.used_reranking': true }
    });

    return response;
  }, { name: 'rag-reranking-pipeline' });
}
```

---

## RAG Cost Optimization

### Track Context Size

```typescript
const context = await lumina.trace(
  async () => {
    const results = await vectorSearch(question);
    const contextText = results.join('\n\n');

    return contextText;
  },
  {
    name: 'rag-retrieval',
    attributes: {
      'rag.context_chars': contextText.length,
      'rag.context_tokens': estimateTokens(contextText),
      'rag.documents_retrieved': results.length,
    },
  }
);
```

### Alert on Context Bloat

In your Lumina dashboard, set up alerts:

- Context length > 3000 tokens (warning)
- Context length > 5000 tokens (critical)
- Cost per request > $0.05 (warning)

### Compare RAG Strategies

Use Lumina's replay feature to test:

```typescript
// Strategy A: Retrieve 10 documents
const strategyA = { topK: 10, rerank: false };

// Strategy B: Retrieve 20, rerank to 5
const strategyB = { topK: 20, rerank: true, finalK: 5 };

// Capture 100 production queries
// Run replay with strategyA vs strategyB
// Compare:
//   - Average cost
//   - Response quality (semantic similarity)
//   - Latency
```

---

## RAG Quality Monitoring

### Track Retrieval Quality

```typescript
const context = await lumina.trace(
  async () => {
    const results = await vectorSearch(question);

    // Track retrieval relevance scores
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return {
      context: results.map((r) => r.text).join('\n'),
      avgRelevance: avgScore,
    };
  },
  {
    name: 'rag-retrieval',
    attributes: {
      'rag.avg_relevance_score': avgScore,
      'rag.min_relevance_score': Math.min(...results.map((r) => r.score)),
    },
  }
);
```

### Detect Context Utilization

Lumina's semantic scorer can detect when the LLM ignores context:

```typescript
// Lumina automatically tracks:
// - Did the response use the retrieved context?
// - Semantic similarity to expected output
// - Hallucination detection

// You'll get alerts like:
// "🚨 RAG quality drop: Response ignoring context (score: 0.58)"
```

---

## Vector Database Integration Examples

### Pinecone

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone();
const index = pinecone.index('knowledge-base');

const context = await lumina.trace(
  async () => {
    const embedding = await getEmbedding(query);

    const results = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    return results.matches;
  },
  {
    name: 'rag-retrieval-pinecone',
    attributes: {
      'rag.vector_db': 'pinecone',
      'rag.index': 'knowledge-base',
      'rag.dimension': 1536,
    },
  }
);
```

### Weaviate

```typescript
import weaviate from 'weaviate-ts-client';

const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

const context = await lumina.trace(
  async () => {
    const results = await client.graphql
      .get()
      .withClassName('Document')
      .withNearText({ concepts: [query] })
      .withLimit(5)
      .withFields('content _additional { distance }')
      .do();

    return results.data.Get.Document;
  },
  {
    name: 'rag-retrieval-weaviate',
    attributes: {
      'rag.vector_db': 'weaviate',
      'rag.class': 'Document',
    },
  }
);
```

### Chroma

```typescript
import { ChromaClient } from 'chromadb';

const client = new ChromaClient();
const collection = await client.getCollection({ name: 'documents' });

const context = await lumina.trace(
  async () => {
    const results = await collection.query({
      queryTexts: [query],
      nResults: 5,
    });

    return results.documents[0];
  },
  {
    name: 'rag-retrieval-chroma',
    attributes: {
      'rag.vector_db': 'chroma',
      'rag.collection': 'documents',
    },
  }
);
```

### Supabase Vector (pgvector)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

const context = await lumina.trace(
  async () => {
    const embedding = await getEmbedding(query);

    const { data } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_count: 5,
    });

    return data;
  },
  {
    name: 'rag-retrieval-supabase',
    attributes: {
      'rag.vector_db': 'supabase-pgvector',
    },
  }
);
```

---

## RAG Dashboard Metrics

Once instrumented, Lumina tracks:

### Cost Metrics

- **Total RAG cost** = Retrieval cost + Generation cost
- **Cost breakdown**: What % is retrieval vs generation?
- **Cost per document**: Are you retrieving too many?

### Performance Metrics

- **Retrieval latency**: How long does vector search take?
- **Generation latency**: How long does the LLM take?
- **Total latency**: End-to-end RAG pipeline time

### Quality Metrics

- **Retrieval relevance**: Are the right documents being retrieved?
- **Context utilization**: Is the LLM using the context?
- **Response quality**: Semantic similarity to expected output

### Alerts You'll Get

- 🚨 **Cost spike**: "RAG cost +45% (context grew from 1K → 3K tokens)"
- ⚠️ **Quality drop**: "Response ignoring context (semantic score: 0.62)"
- 🔔 **Latency spike**: "Retrieval taking 2.5s (baseline: 800ms)"

---

## Best Practices

### 1. Always Use Parent-Child Spans

```typescript
// ✅ Good: Clear hierarchy
lumina.trace(
  async () => {
    await lumina.trace(retrieval, { name: 'retrieval' });
    await lumina.trace(generation, { name: 'generation' });
  },
  { name: 'rag-pipeline' }
);

// ❌ Bad: Flat traces
lumina.trace(retrieval);
lumina.trace(generation);
```

### 2. Add Meaningful Attributes

```typescript
// ✅ Good: Rich context
{
  'rag.query': question,
  'rag.num_results': 5,
  'rag.context_tokens': 1245,
  'rag.vector_db': 'pinecone',
}

// ❌ Bad: No context
{ name: 'retrieval' }
```

### 3. Track Retrieval Quality

```typescript
// ✅ Good: Track relevance scores
attributes: {
  'rag.avg_relevance': 0.87,
  'rag.min_relevance': 0.72,
}

// ❌ Bad: No quality metrics
```

### 4. Version Your RAG Pipeline

```typescript
// ✅ Good: Track versions
attributes: {
  'rag.version': '2.1',
  'rag.strategy': 'reranking',
}

// Use Lumina's replay to compare v2.0 vs v2.1
```

---

## Troubleshooting

### High Costs?

Check Lumina dashboard:

1. Is context length growing? (alert: context > 3K tokens)
2. Are you retrieving too many documents? (reduce topK)
3. Are you using expensive models? (try Claude Haiku for simple queries)

### Low Quality?

Check Lumina dashboard:

1. Retrieval relevance scores low? (improve embeddings/indexing)
2. Response ignoring context? (improve prompt engineering)
3. Hallucinations? (reduce temperature, improve context)

### Slow Performance?

Check Lumina dashboard:

1. Retrieval slow? (add vector DB indexes, reduce topK)
2. Generation slow? (reduce context length, use faster model)
3. Both slow? (consider caching common queries)

---

## Next Steps

- ✅ Instrument your RAG pipeline with Lumina
- 📊 Set up alerts for cost spikes and quality drops
- 🔄 Use replay to test RAG improvements
- 📈 Track metrics over time to optimize

**Need help?** Check out:

- [Multi-span tracing guide](./multi-span-tracing.md)
- [Best practices for AI pipelines](./ai-pipeline-best-practices.md)
- [API reference](/docs/api/API_REFERENCE.md)
