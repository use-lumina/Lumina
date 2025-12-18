# Lumina Architecture

## System Overview

Lumina is a microservices-based observability platform for LLM applications, consisting of three main services with async message processing via NATS JetStream and caching via Redis.

```
                    ┌─────────────────────────────────────────────────┐
                    │         CLIENT APPLICATIONS                     │
                    │  Next.js │ Node.js │ Python │ Other Apps        │
                    └──────────────────┬──────────────────────────────┘
                                       │
                                       ▼
                             ┌─────────────────┐
                             │  @lumina/sdk    │
                             │  (Trace Wrapper)│
                             └────────┬────────┘
                                      │ POST /v1/traces
                                      ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                      LUMINA PLATFORM                             │
    │                                                                  │
    │  ┌─────────────────────┐   ┌─────────────────────┐             │
    │  │ INGESTION :9411     │   │  QUERY API :8081    │             │
    │  ├─────────────────────┤   ├─────────────────────┤             │
    │  │ • Receive Traces    │   │ • Query Traces      │             │
    │  │ • Validate          │   │ • Analytics Engine  │             │
    │  │ • Publish to NATS   │   │ • Filter Engine     │             │
    │  │ • Queue Consumer    │   │ • Aggregations      │             │
    │  └──────────┬──────────┘   └──────────┬──────────┘             │
    │             │                           │                        │
    │             ▼                           │                        │
    │  ┌──────────────────────┐              │                        │
    │  │  NATS JetStream      │              │                        │
    │  │  :4222 / :8222       │              │                        │
    │  │  • Async Queue       │              │                        │
    │  │  • Persistence       │              │                        │
    │  │  • Replay Buffer     │              │                        │
    │  └──────────┬───────────┘              │                        │
    │             │                           │                        │
    │             └───────────┐   ┌───────────┘                        │
    │                         ▼   ▼                                    │
    │                  ┌──────────────────┐      ┌──────────────┐     │
    │                  │   PostgreSQL     │      │    Redis     │     │
    │                  │   :5432          │      │    :6379     │     │
    │                  │   • traces       │      │   • Cache    │     │
    │                  │   • replay_sets  │      │   • Semantic │     │
    │                  │   • replay_results      │     Scores   │     │
    │                  └────────┬─────────┘      └──────────────┘     │
    │                           │                                      │
    │             ┌─────────────┴────────────┐                         │
    │             ▼                          │                         │
    │  ┌─────────────────────┐               │                         │
    │  │ REPLAY ENGINE :8082 │               │                         │
    │  ├─────────────────────┤               │                         │
    │  │ • Capture Sets      │               │                         │
    │  │ • Execute Replays   │               │                         │
    │  │ • Compare Results   │               │                         │
    │  │ • Diff Engine       │               │                         │
    │  └─────────────────────┘               │                         │
    │                                         │                         │
    │  ┌──────────────────────────────────────┘                        │
    │  │                                                                │
    │  ▼                                                                │
    │  ┌─────────────────────────────────────────┐                     │
    │  │         @lumina/core (Shared)           │                     │
    │  ├─────────────────────────────────────────┤                     │
    │  │ • Cost Calculator    • Hash/Similarity  │                     │
    │  │ • Diff Engine        • Baseline Engine  │                     │
    │  │ • Alert Engine       • Semantic Scorer  │                     │
    │  └─────────────────────────────────────────┘                     │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Client Applications

Any application instrumented with the Lumina SDK:
- Next.js web applications
- Node.js backend services
- Python services (via OpenTelemetry)
- Any OpenTelemetry-compatible client

### 2. Lumina SDK (`@lumina/sdk`)

**Location:** `/packages/sdk`

**Responsibility:** Client-side instrumentation

**Key Features:**
- Wraps LLM API calls with `traceLLM()`
- Automatically extracts token usage, cost, latency
- Sends traces to Ingestion Service
- Minimal performance overhead
- Configurable endpoints and metadata

**Example:**
```typescript
const lumina = initLumina({
  endpoint: 'http://localhost:9411/v1/traces',
  service_name: 'my-app',
});

const result = await lumina.traceLLM(
  async () => anthropic.messages.create(...),
  { name: 'chat', system: 'anthropic', prompt: '...' }
);
```

### 3. Ingestion Service (Port 9411)

**Location:** `/services/ingestion`

**Responsibility:** Receive and store traces

**Data Flow:**
1. **Receive** - Accept OpenTelemetry JSON traces via POST
2. **Validate** - Check required fields, data types
3. **Enrich** - Calculate costs, extract tokens, add timestamps
4. **Store** - Insert into PostgreSQL `traces` table

**Key Endpoints:**
- `POST /v1/traces` - Ingest traces
- `GET /health` - Health check

**Storage Schema:**
```sql
CREATE TABLE traces (
  trace_id VARCHAR(255),
  span_id VARCHAR(255),
  service_name TEXT,
  model TEXT,
  prompt TEXT,
  response TEXT,
  cost_usd DECIMAL(10, 6),
  latency_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  tags TEXT[],
  metadata JSONB,
  timestamp TIMESTAMPTZ,
  PRIMARY KEY (trace_id, span_id)
);
```

### 4. NATS JetStream (Ports 4222, 8222)

**Location:** Runs via Docker Compose (`infra/docker/docker-compose.yml`)

**Responsibility:** Async message queue for trace processing

**Key Features:**
- Persistent message storage (file-based)
- At-least-once delivery guarantee
- Message replay capability
- Automatic reconnection and retry
- Stream configuration with retention policies

**Configuration:**
```typescript
// Stream: TRACES
// Subject: traces.ingest
// Retention: 24 hours or 1M messages or 1GB (whichever first)
// Storage: File-based persistence
// Discard: Oldest messages when full
```

**Use Cases:**
1. **Async Trace Processing** - Decouples ingestion from database writes
2. **Buffer Spike Traffic** - Handles bursts of traces without overwhelming database
3. **Replay Failed Messages** - Automatically retries failed trace insertions
4. **Observability** - Monitor queue depth and processing lag

**Client Implementation:** `/services/ingestion/src/queue/nats-client.ts`

### 5. Redis (Port 6379)

**Location:** Runs via Docker Compose (`infra/docker/docker-compose.yml`)

**Responsibility:** Caching layer for semantic scores and frequent queries

**Key Features:**
- In-memory key-value store
- Fast read/write operations
- Persistence with AOF (Append-Only File)
- TTL support for cache expiration

**Use Cases:**
1. **Semantic Score Caching** - Cache embedding-based similarity scores
2. **Query Result Caching** - Cache frequent analytics queries
3. **Session Storage** - Store temporary session data (future)
4. **Rate Limiting** - Track API request counts per key (future)

**Future Integration:** Currently provisioned but not yet fully integrated in MVP

### 6. Query Service (Port 8081)

**Location:** `/services/query`

**Responsibility:** Query traces and generate analytics

**Key Features:**
- Flexible filtering (service, model, tags, date range, cost, latency)
- Pagination support
- Cost analytics with aggregation
- Latency percentile calculations
- Tag-based search

**Key Endpoints:**
- `GET /api/traces` - Query traces with filters
- `GET /api/traces/{traceId}` - Get specific trace
- `GET /api/analytics/cost` - Cost analytics
- `GET /api/analytics/latency` - Latency analytics

**Analytics Capabilities:**
```javascript
// Cost Analytics
- Total cost across time ranges
- Average cost per trace
- Cost breakdown by service/model
- Cost trends over time

// Latency Analytics
- P50, P95, P99 percentiles
- Average latency
- Latency breakdown by service/model/endpoint
- Latency trends
```

### 5. Replay Engine (Port 8082)

**Location:** `/services/replay`

**Responsibility:** Regression testing via trace replay

**Data Flow:**
1. **Capture** - Select traces and create replay set
2. **Execute** - Re-run prompts through LLM APIs
3. **Compare** - Calculate diffs using Diff Engine
4. **Store** - Save results to `replay_results` table

**Key Endpoints:**
- `POST /replay/capture` - Create replay set
- `POST /replay/run` - Execute replay
- `GET /replay/{id}` - Get status and summary
- `GET /replay/{id}/diff` - Get detailed comparisons
- `GET /replay` - List all replay sets

**Storage Schema:**
```sql
CREATE TABLE replay_sets (
  replay_id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  trace_ids TEXT[],
  status TEXT, -- pending, running, completed, failed
  total_traces INTEGER,
  completed_traces INTEGER,
  created_at TIMESTAMPTZ
);

CREATE TABLE replay_results (
  result_id UUID PRIMARY KEY,
  replay_id UUID REFERENCES replay_sets,
  trace_id VARCHAR(255),
  span_id VARCHAR(255),
  original_response TEXT,
  replay_response TEXT,
  original_cost DECIMAL,
  replay_cost DECIMAL,
  original_latency INTEGER,
  replay_latency INTEGER,
  hash_similarity DECIMAL,
  semantic_score DECIMAL,
  diff_summary JSONB,
  executed_at TIMESTAMPTZ,
  FOREIGN KEY (trace_id, span_id) REFERENCES traces
);
```

### 6. Core Library (`@lumina/core`)

**Location:** `/packages/core`

**Responsibility:** Shared business logic

**Modules:**

#### Cost Calculator
```typescript
// Token-based cost calculation for various models
calculateCost(model, promptTokens, completionTokens)
```

#### Hash/Similarity
```typescript
// Text similarity using Levenshtein distance
textSimilarity(original, replay) // 0.0 - 1.0
```

#### Diff Engine
```typescript
// Comprehensive comparison logic
compareTraces(original, replay) // Returns DiffResult
calculateSemanticScore(original, replay)
calculateCostDelta(originalCost, replayCost)
calculateLatencyDelta(originalLatency, replayLatency)
```

#### Baseline Engine
```typescript
// Track performance baselines
calculateBaseline(traces)
detectDrift(current, baseline)
```

#### Alert Engine
```typescript
// Threshold-based alerting
checkCostThreshold(cost, threshold)
checkLatencyThreshold(latency, threshold)
```

## Data Flow Diagrams

### Trace Ingestion Flow

```
┌─────────────┐          ┌──────────────┐         ┌──────────────────┐       ┌────────────┐
│ Application │          │ @lumina/sdk  │         │ Ingestion Service│       │ PostgreSQL │
└──────┬──────┘          └──────┬───────┘         └────────┬─────────┘       └─────┬──────┘
       │                        │                           │                       │
       │ traceLLM(fn, metadata) │                           │                       │
       │───────────────────────>│                           │                       │
       │                        │                           │                       │
       │  Execute LLM call      │                           │                       │
       │<───────────────────────│                           │                       │
       │                        │                           │                       │
       │  Return result +       │                           │                       │
       │  metadata              │                           │                       │
       │───────────────────────>│                           │                       │
       │                        │  Extract tokens,          │                       │
       │                        │  cost, latency            │                       │
       │                        │                           │                       │
       │                        │  POST /v1/traces          │                       │
       │                        │──────────────────────────>│                       │
       │                        │                           │  Validate trace data  │
       │                        │                           │                       │
       │                        │                           │  Enrich with calcs    │
       │                        │                           │                       │
       │                        │                           │  INSERT INTO traces   │
       │                        │                           │──────────────────────>│
       │                        │                           │                       │
       │                        │                           │      Success          │
       │                        │                           │<──────────────────────│
       │                        │                           │                       │
       │                        │      200 OK               │                       │
       │                        │<──────────────────────────│                       │
       │                        │                           │                       │
       │  Return original result│                           │                       │
       │<───────────────────────│                           │                       │
       │                        │                           │                       │
```

### Query Flow

```
┌────────┐         ┌───────────────┐      ┌──────────────┐      ┌────────────┐
│ Client │         │ Query Service │      │ @lumina/core │      │ PostgreSQL │
└───┬────┘         └───────┬───────┘      └──────┬───────┘      └─────┬──────┘
    │                      │                     │                     │
    │ GET /api/traces?     │                     │                     │
    │ service=my-app       │                     │                     │
    │─────────────────────>│                     │                     │
    │                      │  Build SQL query    │                     │
    │                      │  with filters       │                     │
    │                      │                     │                     │
    │                      │  SELECT with WHERE clause                │
    │                      │──────────────────────────────────────────>│
    │                      │                     │                     │
    │                      │  Return matching traces                   │
    │                      │<──────────────────────────────────────────│
    │                      │                     │                     │
    │                      │  Apply pagination   │                     │
    │                      │                     │                     │
    │  JSON response       │                     │                     │
    │  (data + pagination) │                     │                     │
    │<─────────────────────│                     │                     │
    │                      │                     │                     │
```

### Replay Flow

```
┌────────┐      ┌────────────────┐     ┌────────────┐     ┌─────────┐    ┌────────────┐
│ Client │      │ Replay Service │     │ PostgreSQL │     │ LLM API │    │ Diff Engine│
└───┬────┘      └────────┬───────┘     └─────┬──────┘     └────┬────┘    └──────┬─────┘
    │                    │                    │                 │                 │
    │ POST /replay/capture                    │                 │                 │
    │───────────────────>│                    │                 │                 │
    │                    │  Validate trace    │                 │                 │
    │                    │  IDs exist         │                 │                 │
    │                    │───────────────────>│                 │                 │
    │                    │                    │                 │                 │
    │                    │  Traces found      │                 │                 │
    │                    │<───────────────────│                 │                 │
    │                    │                    │                 │                 │
    │                    │  INSERT INTO       │                 │                 │
    │                    │  replay_sets       │                 │                 │
    │                    │───────────────────>│                 │                 │
    │                    │                    │                 │                 │
    │  replay_id         │                    │                 │                 │
    │<───────────────────│                    │                 │                 │
    │                    │                    │                 │                 │
    │ POST /replay/run   │                    │                 │                 │
    │ {replay_id}        │                    │                 │                 │
    │───────────────────>│                    │                 │                 │
    │                    │  SELECT traces     │                 │                 │
    │                    │  from replay_set   │                 │                 │
    │                    │───────────────────>│                 │                 │
    │                    │                    │                 │                 │
    │                    │  Return traces     │                 │                 │
    │                    │<───────────────────│                 │                 │
    │                    │                    │                 │                 │
    │                    │    ╔════════════════════════════════════════════════╗ │
    │                    │    ║ Loop: For each trace                          ║ │
    │                    │    ╠════════════════════════════════════════════════╣ │
    │                    │    ║ Re-execute prompt                             ║ │
    │                    │───────────────────────────────────────────────────────>│
    │                    │                    │                 │                 │
    │                    │    ║ New response + metadata       ║                 │
    │                    │<───────────────────────────────────────────────────────│
    │                    │                    │                 │                 │
    │                    │    ║ compareTraces(original, replay)               ║ │
    │                    │───────────────────────────────────────────────────────>│
    │                    │                    │                 │                 │
    │                    │    ║ DiffResult                    ║                 │
    │                    │<───────────────────────────────────────────────────────│
    │                    │                    │                 │                 │
    │                    │    ║ INSERT INTO replay_results    ║                 │
    │                    │───────────────────>│                 │                 │
    │                    │    ╚════════════════════════════════════════════════╝ │
    │                    │                    │                 │                 │
    │                    │  UPDATE replay_sets│                 │                 │
    │                    │  status='completed'│                 │                 │
    │                    │───────────────────>│                 │                 │
    │                    │                    │                 │                 │
    │  Success + stats   │                    │                 │                 │
    │<───────────────────│                    │                 │                 │
    │                    │                    │                 │                 │
```

## Technology Stack

### Runtime & Language
- **Bun** - Fast JavaScript runtime (alternative to Node.js)
- **TypeScript** - Type-safe development

### Web Framework
- **Hono** - Lightweight, fast web framework

### Database & Storage
- **PostgreSQL 14+** - Relational database with JSONB support
- **postgres** library - SQL client for Bun
- **NATS JetStream 2.10** - Message queue with persistence
- **Redis 7** - In-memory cache with AOF persistence

### Client SDKs
- **Anthropic SDK** - For Claude API integration
- **OpenTelemetry** - For trace format compatibility
- **NATS.js** - NATS client for Node.js/Bun

## Scalability Considerations

### Current MVP Architecture
- Single PostgreSQL instance
- Services run on localhost
- No caching layer
- No message queue

### Production Recommendations

1. **Database Scaling**
   - Read replicas for Query Service
   - Connection pooling (PgBouncer)
   - Partitioning traces table by date
   - Archiving old traces to object storage

2. **Service Scaling**
   - Horizontal scaling behind load balancer
   - Container orchestration (Kubernetes)
   - Service mesh for inter-service communication

3. **Performance**
   - Redis cache for frequent queries
   - Message queue (RabbitMQ/Kafka) for async ingestion
   - CDN for static assets
   - Database indexes on common query patterns

4. **Reliability**
   - Health checks and auto-recovery
   - Circuit breakers between services
   - Distributed tracing (Jaeger)
   - Monitoring (Prometheus + Grafana)

## Security Considerations

### Current MVP
- No authentication
- No encryption in transit
- No rate limiting

### Production Requirements
1. **Authentication & Authorization**
   - API key management
   - JWT tokens for user sessions
   - Role-based access control (RBAC)

2. **Encryption**
   - TLS/HTTPS for all endpoints
   - Encrypted database connections
   - Encrypted data at rest

3. **Rate Limiting**
   - Per-API-key limits
   - DDoS protection
   - Request throttling

4. **Data Privacy**
   - PII detection and masking
   - Prompt/response sanitization
   - GDPR compliance features

## Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| Ingestion | 9411 | OpenTelemetry compatibility (Zipkin port) |
| Query API | 8081 | Query and analytics |
| Replay Engine | 8082 | Replay testing |
| PostgreSQL | 5432 | Database (default) |
| Example App | 3000 | Next.js demo application |

## File Structure

```
lumina/
├── packages/
│   ├── sdk/              # Client SDK
│   └── core/             # Shared business logic
├── services/
│   ├── ingestion/        # Trace ingestion service
│   ├── query/            # Query API service
│   └── replay/           # Replay engine service
├── examples/
│   └── nextjs-rag/       # Example application
└── docs/                 # Documentation
```

## Future Enhancements

1. **Dashboard UI** - Web interface for visualizing traces
2. **Real-time Streaming** - WebSocket support for live traces
3. **Advanced Analytics** - Machine learning-based insights
4. **Multi-tenancy** - Support for multiple organizations
5. **Alerting** - Webhook notifications for thresholds
6. **Semantic Search** - Embedding-based similarity (currently hash-based)
7. **Distributed Tracing** - Full span tree visualization
8. **Cost Forecasting** - Predict future costs based on trends

## Related Documentation

- [Quickstart Guide](./QUICKSTART.md)
- [API Reference](./API_REFERENCE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)