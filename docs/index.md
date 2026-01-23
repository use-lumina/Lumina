---
layout: default
title: Home
nav_order: 1
description: 'Lumina is an open-source, OpenTelemetry-native observability platform for AI systems'
permalink: /
---

# Lumina Documentation

**Open-source, OpenTelemetry-native observability for AI systems**

Lumina is a lightweight observability platform for LLM applications that helps you track costs, latency, and quality across your AI systems with minimal overhead.

---

## 🚀 Quick Start

Get Lumina running in 5 minutes:

1. **[Quickstart Guide](./guides/QUICKSTART.md)** - Step-by-step installation
2. **[Integration Guides](./guides/INTEGRATIONS.md)** - Connect your LLM apps
3. **[API Reference](./api/API_REFERENCE.md)** - Complete API docs

---

## 📖 Documentation

### Getting Started

- **[Quickstart Guide](./guides/QUICKSTART.md)** - Install and run Lumina in 5 minutes
- **[FAQ](./guides/FAQ.md)** - Common questions answered
- **[Troubleshooting](./guides/TROUBLESHOOTING.md)** - Fix common issues

### Integration Guides

- **[Integrations Overview](./guides/INTEGRATIONS.md)** - All supported providers
- OpenAI Integration
- Anthropic (Claude) Integration
- LangChain Integration
- Vercel AI SDK Integration

### Architecture & Advanced

- **[Architecture Overview](./guides/ARCHITECTURE.md)** - System design and components
- **[Multi-Span Tracing](./guides/multi-span-tracing.md)** - Complex trace patterns
- **[RAG Integration](./guides/rag-integration.md)** - RAG pipeline observability
- **[Best Practices](./guides/ai-pipeline-best-practices.md)** - Production tips

### API Reference

- **[API Reference](./api/API_REFERENCE.md)** - Complete REST API docs
- **[OpenAPI Spec](./api/openapi.yaml)** - Swagger/OpenAPI specification

---

## ✨ Features

### Real-Time Trace Ingestion

Track every LLM call with OpenTelemetry-compatible trace collection. Sub-500ms from trace to dashboard.

### Cost & Quality Monitoring

Get alerted when costs spike or quality drops. Automatic baseline detection and anomaly alerting.

### Replay Testing

Re-run production traces against new prompts or models. Semantic diffing shows you exactly what changed.

### Semantic Comparison

Hybrid quality detection: instant hash-based checks + AI semantic scoring when needed.

### All Features Included

Everything is free forever in self-hosted mode. No feature gating, no artificial limits.

---

## 🏠 Self-Hosted vs Managed Cloud

### Self-Hosted (Free Forever)

- **50,000 traces per day** - Resets at midnight UTC
- **7-day retention** - Automatic cleanup
- **All features** - Alerts, replay, semantic scoring
- **Community support** - GitHub Discussions

Perfect for:

- Individual developers
- Small teams
- Side projects
- Proof of concepts

### Managed Cloud

- **Unlimited traces** - No daily limits
- **Unlimited retention** - Keep your data forever
- **SSO & SAML** - Enterprise authentication
- **SLA support** - 99.9% uptime guarantee
- **Dedicated support** - Email + Slack

Perfect for:

- Production applications
- Enterprise teams
- Companies needing compliance
- Teams wanting hassle-free hosting

[Contact us for pricing →](mailto:your-email@example.com)

---

## 🎯 Why Lumina?

### Built for Backend Engineers

Unlike existing AI observability platforms built for data scientists, Lumina is designed for backend/SRE teams. We use the same observability patterns you already know: traces, P95 latencies, and PagerDuty alerts.

### OpenTelemetry-First

Lumina is built on OpenTelemetry from day one (not retrofitted). This means:

- Works with your existing OTEL stack
- Can send to multiple backends simultaneously
- No vendor lock-in
- Industry standard instrumentation

### Infrastructure-Grade Architecture

Built with production in mind:

- NATS JetStream for high-throughput ingestion
- PostgreSQL for analytical queries
- Redis for caching
- Real-time alerting (<500ms)
- Horizontal scaling (handles 10M+ traces/day)

### Cost + Quality Correlation

The only platform that can query `cost > $0.50 AND quality < 0.8` in a single dashboard. When your `/chat` endpoint gets expensive **and** broken, you know immediately.

---

## 📦 Installation

### Docker Compose (Recommended)

```bash
git clone https://github.com/use-lumina/Lumina
cd Lumina/infra/docker
cp ../../.env.docker.example ../../.env.docker
# Add your ANTHROPIC_API_KEY to .env.docker
docker-compose --env-file ../../.env.docker up -d
```

Dashboard available at: http://localhost:3000

### Kubernetes (Coming Soon)

Helm charts for production Kubernetes deployments coming soon.

---

## 🔌 Quick Integration

```typescript
import { Lumina } from '@uselumina/sdk';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Lumina (no API key needed for self-hosted!)
const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
  serviceName: 'my-app',
});

// Initialize your LLM client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Wrap your LLM call - that's it!
const response = await lumina.traceLLM(
  async () => {
    return await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello!' }],
    });
  },
  {
    name: 'chat-completion',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    prompt: 'Hello!',
  }
);
```

See [Integration Guides](./guides/INTEGRATIONS.md) for more examples.

---

## 🆚 Comparisons

### vs LangSmith

- **Lumina:** OTEL-first, built for backend engineers, infrastructure-grade
- **LangSmith:** Tight LangChain integration, evaluation focus

### vs Langfuse

- **Lumina:** 50k traces/day free, OTEL-native, real-time alerts
- **Langfuse:** Unlimited traces (self-hosted), prompt management

### vs Helicone

- **Lumina:** End-to-end RAG tracing, cost+quality correlation
- **Helicone:** Gateway approach, simple cost tracking

### vs Datadog

- **Lumina:** Purpose-built for AI, startup-friendly pricing
- **Datadog:** General APM, enterprise pricing ($100k+/year)

---

## 🤝 Contributing

We welcome contributions! Check out:

- [Contributing Guide](../CONTRIBUTING.md)
- [GitHub Issues](https://github.com/use-lumina/Lumina/issues)
- [GitHub Discussions](https://github.com/use-lumina/Lumina/discussions)

---

## 📚 Resources

- **[GitHub Repository](https://github.com/use-lumina/Lumina)** - Star us!
- **[Example Applications](https://github.com/use-lumina/Lumina/tree/main/examples)** - Working examples
- **[Changelog](../CHANGELOG.md)** - What's new
- **[Security Policy](../SECURITY.md)** - Reporting vulnerabilities
- **[License](../LICENSE)** - Apache 2.0

---

## 💬 Community

- **[GitHub Discussions](https://github.com/use-lumina/Lumina/discussions)** - Ask questions
- **[Discord](https://discord.gg/your-invite)** - Join the community (coming soon)
- **[Twitter](https://twitter.com/yourusername)** - Follow for updates
- **[Email](mailto:your-email@example.com)** - Contact us

---

## 🔒 Security

Found a security vulnerability? Please email us at [security@yourdomain.com](mailto:security@yourdomain.com). Do not open a public issue.

See our [Security Policy](../SECURITY.md) for details.

---

**Free Forever • Self-Hosted • All Features Included**

Self-hosted Lumina includes all features with 50k traces/day and 7-day retention for $0. Need more? [Upgrade to managed cloud →](mailto:your-email@example.com)
