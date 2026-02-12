# Lumina

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://img.shields.io/npm/v/@uselumina/sdk.svg)](https://www.npmjs.com/package/@uselumina/sdk)
[![CI](https://github.com/use-lumina/Lumina/actions/workflows/ci.yml/badge.svg)](https://github.com/use-lumina/Lumina/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/use-lumina/Lumina?style=social)](https://github.com/use-lumina/Lumina/stargazers)

**Production-grade observability for AI applications.**

Lumina is an OpenTelemetry-native platform for monitoring LLM applications in production. Track costs, latency, and quality across distributed AI systems with full trace visibility and regression testing.

Self-hosted. Open source. Zero vendor lock-in.

![Lumina Dashboard](./docs/assets/screenshots/dashboard-home.png)

---

## Why Lumina

AI applications are fundamentally different from traditional software. Token costs accumulate rapidly. Response quality degrades silently. Latency compounds across multi-step workflows. Production incidents require full trace context to debug.

Existing APM tools treat LLM calls as opaque HTTP requests. Lumina provides native observability for AI systems with automatic cost calculation, quality tracking, and hierarchical tracing for complex pipelines like RAG and agents.

Built on OpenTelemetry standards, Lumina integrates into your existing infrastructure without vendor lock-in.

---

## Features

**Cost Tracking**
Automatic cost calculation for OpenAI, Anthropic, and other providers. Track spending per service, model, user, or query.

**Distributed Tracing**
OpenTelemetry-native architecture with hierarchical span support. Visualize complex AI workflows including RAG pipelines, agent loops, and multi-model systems.

**Regression Testing**
Capture production traces and replay them with modified prompts. Compare responses side-by-side with semantic similarity scoring to detect quality regressions before deployment.

**Real-Time Analytics**
Query traces by service, model, tags, cost, latency, or custom metadata. Built on PostgreSQL with efficient indexing for production workloads.

**Smart Alerting**
Configure thresholds for cost spikes, latency degradation, and quality drops. Webhook integration for Slack, PagerDuty, or custom endpoints.

**Production Ready**
PostgreSQL backend with automatic schema management. NATS-based queue for reliable ingestion. Configurable retention policies and rate limits.

---

## Quick Start

### Docker Compose (Recommended)

Start Lumina with all services in under 60 seconds:

```bash
git clone https://github.com/use-lumina/Lumina.git
cd Lumina/infra/docker
docker compose up -d
```

Access the dashboard at `http://localhost:3000`.

All services run without authentication by default. Secure via network isolation or reverse proxy in production.

### Manual Setup

For development or custom deployments:

```bash
# 1. Clone and install dependencies
git clone https://github.com/use-lumina/Lumina.git
cd Lumina
bun install

# 2. Initialize database
createdb lumina

# 3. Start services
cd services/ingestion && bun run dev  # Port 9411
cd services/api && bun run dev        # Port 8081
cd services/replay && bun run dev     # Port 8082
cd apps/dashboard && bun run dev      # Port 3000
```

---

## Instrument Your Application

Install the SDK:

```bash
npm install @uselumina/sdk
```

Wrap your LLM calls:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { initLumina } from '@uselumina/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const lumina = initLumina({
  endpoint: 'http://localhost:9411/v1/traces',
  service_name: 'my-service',
});

const response = await lumina.traceLLM(
  async () =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello!' }],
    }),
  {
    name: 'chat-completion',
    system: 'anthropic',
    prompt: 'Hello!',
    metadata: { userId: 'user-123' },
  }
);
```

Traces appear in the dashboard immediately with automatic cost calculation and token tracking.

### Hierarchical Tracing

Track complex workflows with parent-child span relationships:

```typescript
const result = await lumina.trace('rag_pipeline', async (parentSpan) => {
  parentSpan.setAttribute('user_query', query);

  // Child operation 1: Vector retrieval
  const documents = await lumina.trace('vector_search', async () => {
    return await vectorDB.search(query);
  });

  // Child operation 2: LLM synthesis (automatically nested)
  const completion = await lumina.traceLLM(
    () =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        messages: [{ role: 'user', content: buildPrompt(query, documents) }],
      }),
    { name: 'llm_synthesis', system: 'anthropic' }
  );

  return completion;
});
```

View the complete trace hierarchy in the dashboard with per-span costs and latency breakdowns.

---

## Architecture

```
┌─────────────────────┐
│  Application        │
│  + @uselumina/sdk   │
└──────────┬──────────┘
           │ OTLP/HTTP
           v
┌──────────────────────────────────────────────┐
│  Lumina Platform                             │
│                                              │
│  ┌──────────┐    ┌──────────┐   ┌────────┐ │
│  │Ingestion │───►│   NATS   │──►│Workers │ │
│  │  :9411   │    │  Queue   │   │(Async) │ │
│  └──────────┘    └──────────┘   └───┬────┘ │
│                                      │      │
│  ┌──────────┐    ┌──────────────────▼────┐ │
│  │ Query    │◄───│    PostgreSQL         │ │
│  │ API      │    │  (Traces + Analytics) │ │
│  │  :8081   │    └───────────────────────┘ │
│  └────┬─────┘                               │
│       │                                     │
│  ┌────▼──────┐   ┌──────────────┐          │
│  │ Dashboard │   │Replay Engine │          │
│  │  :3000    │   │    :8082     │          │
│  └───────────┘   └──────────────┘          │
└──────────────────────────────────────────────┘
```

**Ingestion Service**
Receives OTLP traces over HTTP. Validates schema and publishes to NATS for async processing.

**Worker Pool**
Consumes traces from queue. Calculates costs, extracts metadata, and persists to PostgreSQL.

**Query API**
Provides REST endpoints for trace retrieval, analytics, and filtering. Powers the dashboard and external integrations.

**Replay Engine**
Captures production traces, re-executes with modified parameters, and compares outputs using semantic similarity models.

**Dashboard**
Next.js application for visualization, trace inspection, and replay management.

Full architecture documentation: [docs/guides/ARCHITECTURE.md](./docs/guides/ARCHITECTURE.md)

---

## Self-Hosted Limits

The open-source version includes usage limits to prevent abuse:

- **50,000 traces per day** — Resets at midnight UTC
- **7-day retention** — Automatic cleanup of older traces
- **All features enabled** — No paywalled functionality

For unlimited usage, deploy with custom configuration or consider the managed cloud offering.

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgres://user:password@localhost:5432/lumina

# Service Ports
INGESTION_PORT=9411
QUERY_PORT=8081
REPLAY_PORT=8082

# Retention Policy
TRACE_RETENTION_DAYS=7
DAILY_TRACE_LIMIT=50000

# Replay (optional - only for LLM re-execution)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### SDK Configuration

```typescript
const lumina = initLumina({
  endpoint: 'http://localhost:9411/v1/traces',
  service_name: 'my-service',

  // Optional: disable in development
  enabled: process.env.NODE_ENV === 'production',

  // Optional: custom metadata
  resource: {
    environment: 'production',
    version: '1.2.0',
  },
});
```

---

## API Reference

### Ingestion (Port 9411)

```bash
POST /v1/traces
```

Accepts OTLP/JSON formatted traces. Compatible with OpenTelemetry SDKs.

### Query API (Port 8081)

```bash
GET  /api/traces
GET  /api/traces/:id
GET  /api/analytics/cost
GET  /api/analytics/latency
POST /api/alerts
```

Full API documentation: [docs/api/API_REFERENCE.md](./docs/api/API_REFERENCE.md)

### Replay Engine (Port 8082)

```bash
POST /replay/capture     # Create replay set from trace IDs
POST /replay/run         # Execute replay with new parameters
GET  /replay/:id         # Get replay status
GET  /replay/:id/diff    # Compare original vs replayed outputs
```

---

## Use Cases

**Production Monitoring**
Track all LLM calls across microservices. Identify expensive queries, slow endpoints, and quality degradations.

**Cost Optimization**
Analyze spending by model, service, and user. Find opportunities to switch models or optimize prompts.

**Regression Testing**
Test prompt changes against real production queries before deployment. Catch quality regressions with semantic scoring.

**Debugging**
Reproduce production issues with full trace context. View prompt, response, model parameters, and execution timeline.

**Compliance**
Audit all AI interactions with complete logs. Filter by user, timestamp, or custom metadata.

---

## Documentation

- [Quickstart Guide](./docs/guides/QUICKSTART.md) — Get running in 5 minutes
- [Architecture](./docs/guides/ARCHITECTURE.md) — System design and components
- [API Reference](./docs/api/API_REFERENCE.md) — Complete REST API documentation
- [Multi-Span Tracing](./docs/guides/multi-span-tracing.md) — Hierarchical trace implementation
- [Troubleshooting](./docs/guides/TROUBLESHOOTING.md) — Common issues and solutions

---

## Examples

Full example applications in `/examples`:

- **[nextjs-rag](./examples/nextjs-rag)** — Next.js RAG application with hierarchical tracing
- **[anthropic-basic](./examples/anthropic-basic)** — Basic Claude integration
- **[openai-basic](./examples/openai-basic)** — Basic GPT integration

---

## Deployment

### Docker

Use the provided Docker Compose configuration for production deployments:

```bash
cd infra/docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Kubernetes

Helm charts coming soon. See [infra/k8s](./infra/k8s) for manifests.

### Managed Cloud

For teams preferring a fully managed solution with enterprise features, SSO, and SLA guarantees, visit [uselumina.io](https://uselumina.io).

---

## Requirements

- **Runtime:** Bun 1.0+ or Node.js 20+
- **Database:** PostgreSQL 14+
- **Queue:** NATS 2.9+
- **Memory:** 2GB minimum, 4GB recommended

---

## Roadmap

- [ ] Helm charts for Kubernetes deployment
- [ ] Support for additional LLM providers (Cohere, Replicate, Together)
- [ ] Custom alert rules with complex thresholds
- [ ] Trace sampling for high-volume workloads
- [ ] Multi-tenancy support
- [ ] Prometheus metrics export

See [GitHub Issues](https://github.com/use-lumina/Lumina/issues) for detailed roadmap and feature requests.

---

## Contributing

Contributions are welcome from developers of all experience levels.

**Getting Started**

1. Read the [Contributing Guide](./CONTRIBUTING.md)
2. Browse [Good First Issues](https://github.com/use-lumina/Lumina/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
3. Join the discussion in [GitHub Discussions](https://github.com/use-lumina/Lumina/discussions)

**Development Setup**

```bash
git clone https://github.com/use-lumina/Lumina.git
cd Lumina
bun install
createdb lumina

# Run tests
bun test

# Start services in dev mode
bun run dev
```

---

## License

Apache 2.0 — See [LICENSE](./LICENSE) for details.

Lumina is free and open-source software. Use it for any purpose, including commercial projects, without restriction.

---

## Support

- **Documentation:** [docs.uselumina.io](http://docs.uselumina.io/)
- **Bug Reports:** [GitHub Issues](https://github.com/use-lumina/Lumina/issues)
- **Discussions:** [GitHub Discussions](https://github.com/use-lumina/Lumina/discussions)
- **Commercial Support:** Contact us at [uselumina.io](https://uselumina.io)

---

Built by the open-source community. [Star us on GitHub](https://github.com/use-lumina/Lumina) if Lumina helps your team.
