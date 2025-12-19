# AI Pipeline Best Practices

A comprehensive guide to instrumenting, monitoring, and optimizing AI applications with Lumina.

## Table of Contents

- [Instrumentation Best Practices](#instrumentation-best-practices)
- [Cost Optimization](#cost-optimization)
- [Quality Monitoring](#quality-monitoring)
- [Performance Tuning](#performance-tuning)
- [Error Handling](#error-handling)
- [Security & Privacy](#security--privacy)
- [Production Readiness](#production-readiness)

---

## Instrumentation Best Practices

### Start with the Critical Path

Instrument your most expensive or failure-prone operations first:

```typescript
// ✅ Priority 1: LLM calls (expensive)
await lumina.trace(() => llm.generate(prompt), {
  name: 'llm-generation'
});

// ✅ Priority 2: Vector searches (can be slow)
await lumina.trace(() => vectorDB.search(query), {
  name: 'vector-search'
});

// ❌ Priority 3: Trivial operations (skip)
// Don't instrument: string formatting, simple math, etc.
```

### Use Semantic Naming

Name spans to describe **what** they do, not **how**:

```typescript
// ✅ Good: Semantic names
'user-authentication'
'product-recommendation'
'order-validation'
'fraud-detection'

// ❌ Bad: Technical names
'api-call-1'
'function-xyz'
'step-3'
```

### Add Business Context

Include attributes that help debug business logic:

```typescript
await lumina.trace(async () => {
  return await processOrder(order);
}, {
  name: 'order-processing',
  attributes: {
    // Business context
    'order.id': order.id,
    'order.total': order.total,
    'customer.tier': customer.tier,
    'payment.method': order.paymentMethod,

    // Technical context
    'region': process.env.AWS_REGION,
    'version': '2.1.0',
  }
});
```

### Group Related Operations

Use parent spans to organize complex workflows:

```typescript
// ✅ Good: Grouped workflow
await lumina.trace(async () => {
  const user = await lumina.trace(fetchUser, { name: 'fetch-user' });
  const perms = await lumina.trace(checkPerms, { name: 'check-permissions' });
  const data = await lumina.trace(fetchData, { name: 'fetch-data' });
  return format(data);
}, { name: 'user-dashboard-load' });

// ❌ Bad: Flat structure
await lumina.trace(fetchUser);
await lumina.trace(checkPerms);
await lumina.trace(fetchData);
```

---

## Cost Optimization

### Track Cost Attribution

Tag traces with cost centers:

```typescript
await lumina.trace(async () => {
  // ... LLM call
}, {
  name: 'customer-support-response',
  attributes: {
    'cost_center': 'customer-support',
    'customer.id': customerId,
    'customer.plan': 'enterprise', // For cost allocation
  }
});
```

### Set Cost Budgets

Monitor spending per service/feature:

```typescript
// In Lumina dashboard, set alerts:
// - Daily cost for 'customer-support' > $100
// - Weekly cost for 'product-recommendations' > $500
// - Monthly total cost > $5,000
```

### Use Cheaper Models Strategically

```typescript
async function smartModelSelection(task: Task) {
  return await lumina.trace(async () => {

    // Simple tasks: Use cheap models
    if (task.complexity === 'low') {
      return await lumina.trace(() => {
        return claudeHaiku.generate(task.prompt);
      }, {
        name: 'llm-haiku',
        attributes: { 'model.tier': 'budget' }
      });
    }

    // Complex tasks: Use powerful models
    return await lumina.trace(() => {
      return claudeSonnet.generate(task.prompt);
    }, {
      name: 'llm-sonnet',
      attributes: { 'model.tier': 'premium' }
    });

  }, { name: 'smart-model-selection' });
}

// Track in Lumina:
// - How often is each tier used?
// - What's the cost difference?
// - Is quality maintained with budget tier?
```

### Cache Aggressively

```typescript
async function cachedLLMCall(prompt: string) {
  return await lumina.trace(async () => {

    // Check cache
    const cached = await cache.get(prompt);
    if (cached) {
      // Cache hit: $0 cost!
      return cached;
    }

    // Cache miss: Pay for LLM
    const result = await lumina.trace(() => {
      return llm.generate(prompt);
    }, {
      name: 'llm-call',
      attributes: { 'cache.hit': false }
    });

    await cache.set(prompt, result);
    return result;

  }, { name: 'cached-llm' });
}

// Track in Lumina:
// - Cache hit rate
// - Cost savings from caching
// - Set alert if hit rate drops below 70%
```

### Monitor Token Usage

```typescript
await lumina.trace(async () => {
  const response = await llm.generate(prompt);

  return response;
}, {
  name: 'llm-generation',
  attributes: {
    'tokens.input': prompt.length / 4, // rough estimate
    'tokens.output': response.length / 4,
    'tokens.total': (prompt.length + response.length) / 4,
    'cost.per_1k_tokens': 0.003,
  }
});

// Set alerts:
// - Prompt tokens > 5,000 (context too large?)
// - Output tokens > 2,000 (response too verbose?)
```

---

## Quality Monitoring

### Establish Baselines

Track quality metrics over time:

```typescript
await lumina.trace(async () => {
  const response = await llm.generate(prompt);

  // Track quality indicators
  return response;
}, {
  name: 'content-generation',
  attributes: {
    'quality.response_length': response.length,
    'quality.contains_citation': response.includes('['),
    'quality.sentiment': analyzeSentiment(response),
    'quality.reading_level': calculateReadingLevel(response),
  }
});

// Lumina will baseline these metrics
// Alert when they deviate significantly
```

### Detect Hallucinations

```typescript
async function factCheckResponse(query: string, response: string) {
  return await lumina.trace(async () => {

    // Use Lumina's semantic scorer
    // It automatically detects when responses don't match expected quality

    return response;
  }, {
    name: 'fact-checked-response',
    attributes: {
      'query': query,
      'response.length': response.length,
    }
  });
}

// Lumina's semantic scorer will alert you when:
// - Response quality drops below baseline
// - Responses become inconsistent
// - Hallucinations detected
```

### A/B Test Prompts

Use Lumina's replay feature:

```typescript
// Version A (current production)
const promptA = "Summarize this article concisely:";

// Version B (test)
const promptB = "Provide a brief, accurate summary of this article:";

// 1. Capture 100 production requests
// 2. Run replay with promptA vs promptB
// 3. Compare in Lumina dashboard:
//    - Cost: Which is cheaper?
//    - Quality: Semantic similarity scores
//    - Speed: Which is faster?
//    - Choose winner based on data!
```

### Monitor User Satisfaction

```typescript
await lumina.trace(async () => {
  const response = await generateResponse(query);

  // ... show to user ...

  return response;
}, {
  name: 'user-query',
  attributes: {
    'user.id': userId,
    'response.id': responseId, // Track for feedback later
  }
});

// Later, when user gives feedback:
async function recordFeedback(responseId: string, rating: number) {
  // Associate feedback with the trace
  await lumina.addAttribute(responseId, {
    'user.rating': rating,
    'user.satisfied': rating >= 4,
  });
}

// Track in Lumina:
// - Average user rating per endpoint
// - Correlation between cost and satisfaction
// - Alert when satisfaction drops
```

---

## Performance Tuning

### Identify Bottlenecks

Multi-span traces show you where time is spent:

```typescript
// Your trace shows:
📊 api-request (total: 3.5s)
  ├─ auth (50ms) ✅
  ├─ db-query (100ms) ✅
  ├─ vector-search (2.8s) ⚠️ SLOW!
  └─ llm-call (550ms) ✅

// Action: Focus on vector search optimization!
```

### Parallelize When Possible

```typescript
// ❌ Bad: Sequential (3s total)
const user = await fetchUser(userId);
const orders = await fetchOrders(userId);
const recommendations = await fetchRecs(userId);

// ✅ Good: Parallel (1s total)
const [user, orders, recommendations] = await Promise.all([
  lumina.trace(() => fetchUser(userId), { name: 'fetch-user' }),
  lumina.trace(() => fetchOrders(userId), { name: 'fetch-orders' }),
  lumina.trace(() => fetchRecs(userId), { name: 'fetch-recs' }),
]);
```

### Use Streaming for Long Responses

```typescript
async function streamingResponse(prompt: string) {
  return await lumina.trace(async () => {

    const stream = await llm.generateStream(prompt);

    // Time to first token (TTFT)
    const startTime = Date.now();
    let ttft: number | null = null;

    for await (const chunk of stream) {
      if (ttft === null) {
        ttft = Date.now() - startTime;
      }
      yield chunk;
    }

    return { ttft };
  }, {
    name: 'streaming-llm',
    attributes: {
      'streaming': true,
      // ttft will be added when known
    }
  });
}

// Track in Lumina:
// - Time to first token (TTFT)
// - Total generation time
// - Streaming vs non-streaming performance
```

### Set Timeouts

```typescript
async function safeAPICall(input: string) {
  return await lumina.trace(async () => {

    // Set timeout for LLM call
    const timeoutMs = 10000; // 10 seconds

    const result = await Promise.race([
      llm.generate(input),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      ),
    ]);

    return result;
  }, {
    name: 'llm-with-timeout',
    attributes: {
      'timeout.ms': 10000,
    }
  });
}

// Track in Lumina:
// - How often do timeouts occur?
// - Which endpoints time out most?
// - Set alerts for timeout rate > 5%
```

---

## Error Handling

### Graceful Degradation

```typescript
async function robustPipeline(input: string) {
  return await lumina.trace(async () => {

    try {
      // Try primary model
      return await lumina.trace(() => {
        return primaryModel.generate(input);
      }, { name: 'primary-model' });
    } catch (primaryError) {
      // Fallback to secondary model
      try {
        return await lumina.trace(() => {
          return secondaryModel.generate(input);
        }, {
          name: 'fallback-model',
          attributes: {
            'fallback.reason': primaryError.message,
          }
        });
      } catch (secondaryError) {
        // Last resort: cached/static response
        return await lumina.trace(() => {
          return getCachedResponse(input);
        }, {
          name: 'cached-fallback',
          attributes: {
            'fallback.level': 'emergency',
          }
        });
      }
    }

  }, { name: 'robust-pipeline' });
}

// Track in Lumina:
// - Primary success rate
// - Fallback usage rate
// - Alert when fallback rate > 10%
```

### Retry with Exponential Backoff

```typescript
async function retryableCall(input: string, maxRetries = 3) {
  return await lumina.trace(async () => {

    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await lumina.trace(() => {
          return llm.generate(input);
        }, {
          name: 'llm-call-attempt',
          attributes: {
            'retry.attempt': attempt,
            'retry.max': maxRetries,
          }
        });
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await sleep(backoffMs);
        }
      }
    }

    throw lastError;
  }, { name: 'retryable-llm-call' });
}

// Track in Lumina:
// - Success rate by attempt number
// - Most common error types
// - Alert when retry rate > 20%
```

### Track Error Patterns

```typescript
try {
  await lumina.trace(() => riskyOperation(), { name: 'risky-op' });
} catch (error) {
  // Log error with context
  await lumina.trace(() => {
    throw error; // Re-throw to record error
  }, {
    name: 'error-handler',
    attributes: {
      'error.type': error.name,
      'error.message': error.message,
      'error.code': error.code,
      'error.retryable': isRetryable(error),
    }
  });
}

// Track in Lumina:
// - Most common error types
// - Error rate by endpoint
// - Correlation between errors and cost/latency
```

---

## Security & Privacy

### Redact Sensitive Data

```typescript
function redactSensitive(text: string): string {
  return text
    .replace(/\b\d{16}\b/g, '[CARD-REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL-REDACTED]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]');
}

await lumina.trace(async () => {
  const response = await llm.generate(prompt);
  return response;
}, {
  name: 'customer-support',
  attributes: {
    'prompt': redactSensitive(prompt), // Redact before sending to Lumina
    'user.id': userId,
    // Don't log: credit cards, SSNs, passwords, etc.
  }
});
```

### Use API Key Scoping

```typescript
// Production: Use read-only API key for apps
LUMINA_API_KEY=lumina_live_readonly_...

// Development: Use test environment
LUMINA_API_KEY=lumina_test_...
LUMINA_ENVIRONMENT=development

// CI/CD: Use separate key with limited permissions
LUMINA_API_KEY=lumina_ci_...
```

### Implement Data Retention

```typescript
// In Lumina dashboard, set retention policies:
// - Production traces: 30 days
// - Development traces: 7 days
// - PII data: Auto-redacted or 24 hours
// - Error traces: 90 days (for debugging)
```

---

## Production Readiness

### Health Checks

```typescript
// Expose health check endpoint
app.get('/health', async (req, res) => {
  const health = await lumina.trace(async () => {
    return {
      status: 'healthy',
      timestamp: new Date(),
      checks: {
        database: await checkDB(),
        vectorDB: await checkVectorDB(),
        llm: await checkLLMAPI(),
      },
    };
  }, { name: 'health-check' });

  res.json(health);
});
```

### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Flush any pending Lumina traces
  await lumina.flush();

  // Close connections
  await db.close();
  await server.close();

  process.exit(0);
});
```

### Load Testing

```typescript
// Use Lumina to monitor during load tests:

// 1. Run load test (e.g., with k6 or Locust)
// 2. Watch Lumina dashboard in real-time:
//    - Latency percentiles (p50, p95, p99)
//    - Error rate
//    - Cost per request
//    - Throughput
// 3. Identify bottlenecks
// 4. Optimize and re-test
```

### Gradual Rollouts

```typescript
async function featureFlag(userId: string) {
  const useNewModel = rollout.isEnabled(userId, 'new-model-v2');

  return await lumina.trace(async () => {
    if (useNewModel) {
      return await lumina.trace(() => newModel.generate(prompt), {
        name: 'new-model-v2',
        attributes: { 'feature_flag': 'enabled' }
      });
    } else {
      return await lumina.trace(() => oldModel.generate(prompt), {
        name: 'old-model-v1',
        attributes: { 'feature_flag': 'disabled' }
      });
    }
  }, { name: 'model-with-feature-flag' });
}

// Compare in Lumina:
// - New model vs old model performance
// - Cost difference
// - Quality metrics
// - Gradually increase rollout % based on data
```

---

## Quick Reference Checklist

### Before Going to Production

- [ ] Instrument all LLM calls with Lumina
- [ ] Add cost attribution tags (team, feature, customer)
- [ ] Set up cost alerts (daily, weekly, monthly)
- [ ] Set up quality alerts (semantic scoring enabled)
- [ ] Implement error handling and fallbacks
- [ ] Add retry logic for transient failures
- [ ] Redact PII from traces
- [ ] Set data retention policies
- [ ] Test under load
- [ ] Set up health check monitoring
- [ ] Document runbooks for common issues

### Weekly Reviews

- [ ] Review cost trends (which features are expensive?)
- [ ] Review quality metrics (any degradation?)
- [ ] Review error patterns (new errors?)
- [ ] Review latency (any regressions?)
- [ ] Review cache hit rates (can we improve?)
- [ ] Review alert false positive rate (tune thresholds?)

### Monthly Optimization

- [ ] Run replay tests with new prompts/models
- [ ] Analyze cost per feature/customer
- [ ] Identify optimization opportunities
- [ ] Update cost baselines
- [ ] Review security/privacy compliance

---

## Next Steps

- ✅ Follow these best practices in your AI pipelines
- 📊 Monitor metrics in Lumina dashboard
- 🔔 Set up proactive alerts
- 🔄 Use replay for continuous improvement
- 📈 Optimize based on data, not guesses

**Need help?** Check out:
- [RAG integration guide](./rag-integration.md)
- [Multi-span tracing guide](./multi-span-tracing.md)
- [API reference](/docs/api/API_REFERENCE.md)