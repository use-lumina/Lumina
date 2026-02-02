# Advanced Guide: Hierarchical & Multi-Span Tracing

While tracing individual LLM calls is useful, modern AI applications are complex systems with multiple steps. To truly understand and debug these systems, you need to trace the entire workflow, not just the individual components. Lumina achieves this through **hierarchical, multi-span tracing**.

## The Concept: Parent and Child Spans

The core idea is to wrap a complex operation in a single **parent span** and then trace each sub-operation as a **child span**.

This creates a clear, hierarchical view in the Lumina dashboard, allowing you to see both the total time and cost of the entire operation, as well as the performance of each individual step.

A typical RAG (Retrieval-Augmented Generation) pipeline might look like this:

```
Trace: rag_request_abc_123
├─ 📄 rag_pipeline (Parent Span, Total: 1.5s)
│  ├─ 🔎 retrieval (Child Span 1, Duration: 800ms)
│  └─ 🤖 synthesis (Child Span 2, Duration: 700ms)
```

## How to Create Hierarchical Traces

You can create hierarchical traces using the `lumina.trace()` method. Any `trace` or `traceLLM` calls made inside its callback will automatically become child spans of the outer trace.

### Example: Tracing a RAG Pipeline

Here is a practical example showing how to trace a RAG (Retrieval-Augmented Generation) pipeline.

```typescript
import { initLumina } from '@uselumina/sdk';

const lumina = initLumina({ service_name: 'my-rag-app' });

// Your application logic
async function answerQuestionWithRAG(query: string) {
  // Create a parent span for the entire RAG operation
  const answer = await lumina.trace('rag_request', async (parentSpan) => {
    // You can add high-level attributes to the parent span
    parentSpan.setAttribute('user_query', query);
    parentSpan.setAttribute('rag_version', '1.1');

    // --- Child Operation 1: Retrieval ---
    // Use a nested trace for the retrieval step
    const documents = await lumina.trace('retrieval', async (retrievalSpan) => {
      const results = await myVectorDB.query(query, { topK: 5 });
      retrievalSpan.setAttribute('db.results_count', results.length);
      return results;
    });

    parentSpan.addEvent('Successfully retrieved documents');

    // --- Child Operation 2: Synthesis (LLM Call) ---
    // Use traceLLM for the generation step to get automatic LLM metadata
    const response = await lumina.traceLLM(
      () =>
        myLLM.generate({
          prompt: createPrompt(query, documents),
          model: 'claude-3-sonnet',
        }),
      { name: 'synthesis' }
    );

    // The 'retrieval' and 'synthesis' spans will now appear
    // nested under the 'rag_request' span in the Lumina UI.

    return response.completion;
  });

  return answer;
}
```

## Benefits of Hierarchical Tracing

1.  **Pinpoint Bottlenecks**: Instantly see which part of your pipeline is slow. Is it the retrieval from your vector database or the generation from the LLM?
2.  **Attribute Costs**: Understand the cost of each step. You might find that a complex `query_refinement` step is costing more than the final generation.
3.  **Debug with Context**: The parent span holds the context for the entire operation, while child spans provide details for each step, making it easier to debug failures.
4.  **Clear Visualization**: The Lumina dashboard will visualize these traces as a waterfall or flame graph, making the flow of your application intuitive to understand.

## Next Steps

- See a complete, real-world example in our **[RAG System Integration Guide](./rag-integration.md)**.
- Learn about other best practices in our **[AI Pipeline Best Practices Guide](./ai-pipeline-best-practices.md)**.
