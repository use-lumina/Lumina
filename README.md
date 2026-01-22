# Lumina

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![CI](https://github.com/evansinho/Lumina/actions/workflows/ci.yml/badge.svg)](https://github.com/evansinho/Lumina/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/evansinho/Lumina?style=social)](https://github.com/evansinho/Lumina/stargazers)

**Open-source, OpenTelemetry-native observability for AI systems.**

A lightweight observability platform for LLM applications. Track costs, latency, and quality across your AI systems with minimal overhead.

**🔓 Fully open-source** • **🏠 Self-hostable** • **☁️ Managed cloud option available**

## Features

- **Real-time Trace Ingestion** - OpenTelemetry-compatible trace collection
- **Cost & Latency Tracking** - Automatic calculation and analytics
- **Regression Testing** - Replay production traffic to detect quality regressions
- **Flexible Querying** - Filter by service, model, tags, cost, latency
- **Semantic Comparison** - Compare responses for similarity
- **Zero-Config Storage** - PostgreSQL backend with automatic schema creation

## Self-Hosted Limits

The free self-hosted version includes:

- **50,000 traces per day** - Resets daily at midnight UTC
- **7-day retention** - Traces older than 7 days are automatically deleted
- **All features included** - Alerts, replay testing, semantic scoring, and more

For unlimited traces and retention, consider our managed cloud offering. [Contact us](mailto:your-email@example.com) to learn more.

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

### Optional: API Keys for Replay Feature

To use the replay feature with real LLM calls, add API keys to your `.env` file:

```bash
# For Claude models
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# For GPT models
OPENAI_API_KEY=sk-your-key-here
```

> **Note:** API keys are **only required for the replay feature**. All other features work without API keys.

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
  async () =>
    anthropic.messages.create({
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

- **[Quickstart Guide](./docs/guides/QUICKSTART.md)** - Get started in 5 minutes
- **[API Reference](./docs/api/API_REFERENCE.md)** - Complete API documentation (OpenAPI/Swagger)
- **[Architecture](./docs/guides/ARCHITECTURE.md)** - System design and component details
- **[Troubleshooting](./docs/guides/TROUBLESHOOTING.md)** - Common issues and solutions

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

## Deployment Options

### Self-Hosting (Recommended for getting started)

Lumina is designed to be self-hosted on your infrastructure:

- **Full control** over your data and infrastructure
- **Zero vendor lock-in** - you own your observability data
- **Deploy anywhere** - Docker, Kubernetes, bare metal
- **Production-ready** - PostgreSQL backend, OTEL-compliant

Follow the [Quick Start](#quick-start) guide above to get running locally. Docker Compose and Kubernetes deployment guides coming soon.

### Managed Cloud (Coming Soon)

For teams that want a fully managed solution:

- **Hosted infrastructure** - we handle scaling, updates, backups
- **Enterprise features** - SSO, RBAC, SLA guarantees
- **Free tier available** for development and small teams
- **Pricing based on usage** - traces ingested, storage, replays

[Join the waitlist at uselumina.io](https://uselumina.io) for early access to managed Lumina.

## Contributing

We welcome contributions from the community!

- **Read the [Contributing Guide](./CONTRIBUTING.md)** for development setup and guidelines
- **Check [Good First Issues](https://github.com/evansinho/Lumina/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)** for beginner-friendly tasks
- **Join the discussion** in [GitHub Discussions](https://github.com/evansinho/Lumina/discussions)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions.

## License

Apache 2.0 - See [LICENSE](./LICENSE) for details.

Lumina is free and open-source software. You can use it for any purpose, including commercial projects.

## Support

- **Documentation:** [docs/](./docs/)
- **GitHub Issues:** [Bug reports & feature requests](https://github.com/evansinho/Lumina/issues)
- **GitHub Discussions:** [Questions & community chat](https://github.com/evansinho/Lumina/discussions)
- **Examples:** [examples/nextjs-rag](./examples/nextjs-rag)

---

**Built with ❤️ by the Lumina community** • [Star us on GitHub](https://github.com/evansinho/Lumina) ⭐
