# Lumina

A lightweight observability platform for LLM applications. Track costs, latency, and quality across your AI systems with minimal overhead.

## Features

- **Real-time Trace Ingestion** - OpenTelemetry-compatible trace collection
- **Cost & Latency Tracking** - Automatic calculation and analytics
- **Regression Testing** - Replay production traffic to detect quality regressions
- **Flexible Querying** - Filter by service, model, tags, cost, latency
- **Semantic Comparison** - Compare responses for similarity
- **Zero-Config Storage** - PostgreSQL backend with automatic schema creation

## Quick Start

```bash
# 1. Clone and install
git clone <your-repo-url> lumina
cd lumina
bun install

# 2. Create database
createdb lumina

# 3. Start services (in separate terminals)
cd services/ingestion && bun run dev  # Port 9411
cd services/query && bun run dev      # Port 8081
cd services/replay && bun run dev     # Port 8082
```

## Instrument Your Application

```bash
bun add @lumina/sdk
```

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { initLumina } from '@lumina/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const lumina = initLumina({
  endpoint: 'http://localhost:9411/v1/traces',
  service_name: 'my-app',
});

// Wrap your LLM calls
const response = await lumina.traceLLM(
  async () => anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Hello!' }],
  }),
  {
    name: 'chat',
    system: 'anthropic',
    prompt: 'Hello!',
  }
);
```

## Architecture

```
┌─────────────────┐
│  Your App       │
│  + @lumina/sdk  │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────┐
│  Lumina Platform                    │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │Ingestion │  │  Query   │       │
│  │  :9411   │  │  :8081   │       │
│  └────┬─────┘  └────┬─────┘       │
│       │             │              │
│       │   ┌─────────┴──────┐      │
│       └───►   PostgreSQL    │      │
│           └────────┬────────┘      │
│                    │                │
│           ┌────────┴─────────┐     │
│           │  Replay Engine   │     │
│           │      :8082       │     │
│           └──────────────────┘     │
└─────────────────────────────────────┘
```

## Documentation

- **[Quickstart Guide](./docs/QUICKSTART.md)** - Get started in 5 minutes
- **[API Reference](./docs/API_REFERENCE.md)** - Complete API documentation (OpenAPI/Swagger)
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and component details
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Project Structure

```
lumina/
├── packages/
│   ├── sdk/              # Client SDK for instrumentation
│   └── core/             # Shared business logic
│       ├── cost-calculator.ts
│       ├── diff-engine.ts
│       ├── hash.ts
│       └── ...
├── services/
│   ├── ingestion/        # Trace ingestion (Port 9411)
│   ├── query/            # Query API (Port 8081)
│   └── replay/           # Replay engine (Port 8082)
├── examples/
│   └── nextjs-rag/       # Example Next.js application
└── docs/                 # Documentation
```

## API Endpoints

### Ingestion Service (Port 9411)
- `POST /v1/traces` - Ingest traces
- `GET /health` - Health check

### Query API (Port 8081)
- `GET /api/traces` - Query traces
- `GET /api/traces/{id}` - Get specific trace
- `GET /api/analytics/cost` - Cost analytics
- `GET /api/analytics/latency` - Latency analytics

### Replay Engine (Port 8082)
- `POST /replay/capture` - Create replay set
- `POST /replay/run` - Execute replay
- `GET /replay/{id}` - Get replay status
- `GET /replay/{id}/diff` - Get diff results
- `GET /replay` - List replay sets

See [API Reference](./docs/api/API_REFERENCE.md) for complete documentation.

## Example Usage

### Query Traces
```bash
curl "http://localhost:8081/api/traces?service=my-app&limit=10"
```

### Get Cost Analytics
```bash
curl "http://localhost:8081/api/analytics/cost?service=my-app&startDate=2024-01-01"
```

### Run Regression Tests
```bash
# 1. Create replay set
curl -X POST http://localhost:8082/replay/capture \
  -H "Content-Type: application/json" \
  -d '{"name":"My Test","traceIds":["trace1","trace2"]}'

# 2. Execute replay
curl -X POST http://localhost:8082/replay/run \
  -H "Content-Type: application/json" \
  -d '{"replayId":"<replay-id-from-step-1>"}'

# 3. View results
curl "http://localhost:8082/replay/<replay-id>/diff"
```

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript
- **Framework:** Hono
- **Database:** PostgreSQL
- **Standards:** OpenTelemetry

## Requirements

- Bun 1.0+
- PostgreSQL 14+
- Node.js 20+ (for examples)

## Development

```bash
# Install dependencies
bun install

# Run tests (if available)
bun test

# Start services in dev mode
cd services/ingestion && bun run dev
cd services/query && bun run dev
cd services/replay && bun run dev
```

## Configuration

Set environment variables:

```bash
# Database
export DATABASE_URL="postgres://user@localhost:5432/lumina"

# Service ports (optional)
export INGESTION_PORT=9411
export QUERY_PORT=8081
export REPLAY_PORT=8082
```

## MVP Status

This is an MVP implementation with the following completed features:

**Week 1-2: Foundation**
- ✅ Trace ingestion service
- ✅ PostgreSQL storage
- ✅ Cost calculator
- ✅ SDK implementation

**Week 3: Query & Analytics**
- ✅ Query API
- ✅ Cost analytics
- ✅ Latency analytics
- ✅ Tag-based filtering

**Week 4: Replay Engine**
- ✅ Replay capture
- ✅ Replay execution
- ✅ Diff engine with similarity scoring
- ✅ Side-by-side comparison

**Documentation**
- ✅ Quickstart guide
- ✅ API reference (OpenAPI/Swagger)
- ✅ Architecture diagram
- ✅ Troubleshooting guide

## Future Enhancements

- [ ] Dashboard UI
- [ ] Real-time alerting via webhooks
- [ ] Embedding-based semantic search
- [ ] Baseline tracking and drift detection
- [ ] Multi-tenancy support
- [ ] Cost forecasting
- [ ] Advanced analytics

## Contributing

Contributions welcome! Please check the [Troubleshooting Guide](./docs/guides/TROUBLESHOOTING.md) if you encounter any issues.

## License

MIT

## Support

- **Documentation:** [docs/](./docs/)
- **Issues:** Create a GitHub issue
- **Examples:** [examples/nextjs-rag](./examples/nextjs-rag)
