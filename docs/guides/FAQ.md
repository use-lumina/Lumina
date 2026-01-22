# Frequently Asked Questions (FAQ)

## General

### What is Lumina?

Lumina is an open-source, OpenTelemetry-native observability platform for AI systems. It helps you track costs, latency, and quality across your LLM applications with minimal overhead.

### Why did you build Lumina?

Traditional APM tools don't understand semantic degradation, token-level costs, or hallucination detection. Existing "AI observability" platforms were built for data scientists running batch evaluations, not for backend engineers running production systems. Lumina bridges this gap by providing infrastructure-grade observability specifically designed for AI systems.

### Is Lumina production-ready?

Yes! Lumina is built with the same principles as production infrastructure tools: real-time ingestion, at-least-once delivery guarantees, and zero-overhead instrumentation using OpenTelemetry.

## Pricing & Hosting

### How does pricing work?

Lumina uses a simple pricing model:

- **Self-hosted (Free)**: 50,000 traces/day, 7-day retention, all features included
- **Managed Cloud**: Unlimited traces, unlimited retention, SSO, SLA support

### What's the difference between free and paid tiers?

The free self-hosted tier includes **all features**: alerts, replay testing, semantic scoring, and more. The paid tier is for **convenience** (we manage hosting, backups, scaling) and **scale** (unlimited traces and retention).

We follow the GitLab/Supabase model: pay for convenience and scale, not features.

### Do I get all features with self-hosted?

**Yes!** Self-hosted includes:

- ✅ Real-time trace ingestion
- ✅ Cost & quality alerts
- ✅ Replay testing
- ✅ Semantic diff comparison
- ✅ Full dashboard access
- ✅ All integrations (OpenAI, Anthropic, etc.)

The only difference is the 50k traces/day limit and 7-day retention.

### What are the self-hosted limits?

- **50,000 traces per day** - Resets at midnight UTC
- **7-day retention** - Traces older than 7 days are automatically deleted

If you hit these limits, you'll receive a clear error message with the reset time. The limits are in place to keep the self-hosted version lightweight and performant.

### How do I upgrade to managed cloud?

[Contact us](mailto:your-email@example.com) and we'll help you migrate from self-hosted to managed cloud. Migration is seamless - we can import your existing traces and configuration.

### Can I migrate from self-hosted to managed?

Yes! Migration is straightforward:

1. Export your traces (we provide a migration script)
2. We import them into your managed instance
3. Update your SDK endpoint
4. You're done!

### How do retention policies work?

**Self-hosted:** Traces older than 7 days are automatically deleted at 2:00 AM UTC daily. You control this by modifying the retention cleanup job.

**Managed cloud:** Traces are retained based on your plan (90 days for Growth, 2 years for Enterprise).

### Can I customize the self-hosted limits?

Yes! Since it's open-source, you can modify the limits in the code:

- Rate limit: `/services/ingestion/src/middleware/rate-limit.ts`
- Retention: `/services/ingestion/src/jobs/retention-cleanup.ts`

However, we recommend keeping the defaults for optimal performance.

## Technical

### What's the performance impact?

Lumina uses OpenTelemetry's `BatchSpanProcessor` for zero-overhead async ingestion. Typical overhead is **<1ms** per LLM call. The SDK batches traces and sends them in the background without blocking your application.

### How is data secured?

- **Self-hosted:** You control all data. Everything runs in your infrastructure.
- **Managed cloud:** Data is encrypted at rest (AES-256) and in transit (TLS 1.3). We're SOC 2 Type II compliant and GDPR-ready.

### What about GDPR/compliance?

**Self-hosted:** Fully compliant since all data stays in your infrastructure.

**Managed cloud:** We're GDPR compliant, SOC 2 Type II certified, and support data residency requirements (EU, US, APAC regions available).

### Can I use Lumina in production?

Absolutely! Lumina is built for production:

- Real-time ingestion (<500ms from trace to alert)
- At-least-once delivery guarantees
- Horizontal scaling (handles 10M+ traces/day)
- Infrastructure-grade architecture (PostgreSQL, NATS JetStream, Redis)

### How does OpenTelemetry support work?

Lumina is **OpenTelemetry-first by design**:

- Uses standard OTLP format for ingestion
- Implements OpenTelemetry semantic conventions for LLMs (`gen_ai.*`)
- Can send traces to both Lumina AND your existing OTEL backend simultaneously
- Works with any OTEL collector

This means zero lock-in - you can use Lumina alongside Datadog, Grafana, or any other OTEL-compatible tool.

## Features

### What's the replay feature?

Replay lets you re-run production traffic against new prompts or models to detect regressions before deployment:

1. **Capture** a baseline set of production traces
2. **Replay** them with your new prompt/model
3. **Compare** responses using semantic diffing
4. **Deploy** with confidence, knowing quality hasn't regressed

Think of it as integration testing for LLMs.

### How does semantic comparison work?

Lumina uses a **hybrid quality detection system**:

**Tier 1 (Fast):** Hash-based structural comparison (~1ms, free)

- Detects format changes and major content drift

**Tier 2 (Accurate):** LLM semantic scoring (~200ms, $0.0001/trace)

- Uses Claude Haiku to detect hallucinations, tone drift, and factual errors
- Runs automatically when structural similarity is borderline or costs spike

Result: 90% of traces get instant evaluation, but semantic accuracy is never compromised.

### What alerts does Lumina provide?

**Cost Spike Alerts:** Triggered when cost per request increases >20% compared to baseline (configurable threshold).

**Quality Degradation Alerts:** Triggered when semantic similarity drops below 0.7 (configurable threshold).

**Dual-Signal Alerts:** The most powerful - alerts when both cost AND quality degrade simultaneously, indicating a real problem.

### Do I need LLM API keys?

**For self-hosted:**

API keys are **optional** but enable specific features:

- **Anthropic API key**: Required for semantic scoring (uses Claude Haiku)
  - Cost: ~$50/month for 100k daily traces
- **Anthropic + OpenAI API keys**: Required for replay feature with real LLM calls
  - Without keys, replay runs in simulation mode (no real API calls)

**All other features work without API keys** (trace ingestion, cost monitoring, alerts, dashboard).

**For managed cloud:**

- We handle all API keys
- All features included in your plan

### Can I use other LLM providers?

Yes! Lumina supports:

- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Open-source models (Llama, Mistral, etc.)
- Custom models

The SDK auto-calculates costs based on the model and token counts.

### How do I contribute?

We welcome contributions! Check out:

- [Contributing Guide](../../CONTRIBUTING.md)
- [GitHub Issues](https://github.com/use-lumina/Lumina/issues)
- [GitHub Discussions](https://github.com/use-lumina/Lumina/discussions)

## Replay Feature

### What is the replay feature?

The replay feature lets you re-run production traces with different models or prompts to test changes **before** deploying to production. It's like snapshot testing for LLMs.

**Use cases:**

- Test model migrations (e.g., GPT-4 → Claude Haiku)
- Optimize prompts and measure impact
- Compare costs and quality across models
- A/B test system prompts

### Do I need API keys for replay?

**Yes**, for real LLM API calls you need:

- **ANTHROPIC_API_KEY**: To test Claude models ([Get from console.anthropic.com](https://console.anthropic.com/))
- **OPENAI_API_KEY**: To test GPT models ([Get from platform.openai.com](https://platform.openai.com/api-keys))

Add these to your `.env.docker` file:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-key-here
```

**Without API keys?** The replay feature runs in **simulation mode** - it generates synthetic variations without making real API calls. Useful for testing the feature itself without costs.

### How do I set up replay with API keys?

1. Add API keys to `.env.docker`:

   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   OPENAI_API_KEY=sk-your-key-here
   ```

2. Restart services:

   ```bash
   cd infra/docker
   docker-compose down
   docker-compose --env-file ../../.env.docker up -d
   ```

3. Navigate to **Replay Studio** at `http://localhost:3000/replay`

4. Create a replay set, configure model/prompt, and run!

See the full [Replay Guide](./REPLAY.md) for detailed instructions.

### What's the cost of running replays?

Replay costs depend on your LLM provider:

- **Anthropic Claude Haiku**: ~$0.00025 per request
- **Anthropic Claude Sonnet**: ~$0.003 per request
- **OpenAI GPT-3.5**: ~$0.0005 per request
- **OpenAI GPT-4**: ~$0.03 per request

**Example:** Replaying 100 traces with Claude Haiku costs ~$0.025 (2.5 cents).

The replay UI shows cost comparison so you can see potential savings before deploying.

### Can I test without spending money?

**Yes!** Two ways:

1. **Simulation mode**: Don't set API keys - replay generates synthetic variations
2. **Small batches**: Test with 5-10 traces first to verify costs

### What metrics does replay provide?

For each replay, you get:

- **Cost comparison** (original vs replay)
- **Latency comparison** (original vs replay)
- **Prompt changes** (side-by-side if modified)
- **Response changes** (original vs replay)
- **Hash similarity** (character-level exact match: 0-100%)
- **Semantic similarity** (meaning match: 0-100%)

**Example output:**

```
Cost: -68% ($0.000585 → $0.000186)
Latency: -43% (2481ms → 1422ms)
Semantic similarity: 38.9%
Model changed: claude-sonnet-4 → claude-haiku-3.5
```

## Troubleshooting

### My traces aren't showing up

1. Check the ingestion service is running:

   ```bash
   docker-compose ps ingestion
   curl http://localhost:8080/health
   ```

2. Check the ingestion logs:

   ```bash
   docker-compose logs -f ingestion
   ```

3. Verify your SDK configuration:

   ```typescript
   const lumina = new Lumina({
     endpoint: 'http://localhost:8080/v1/traces', // ← Must be correct
   });
   ```

4. For self-hosted, ensure `AUTH_REQUIRED=false` in `.env.docker`

### I'm getting a 429 error

You've hit the **50,000 traces/day limit** for self-hosted. The limit resets at midnight UTC.

To check your current usage:

```bash
docker-compose logs ingestion | grep "rate limit"
```

Solutions:

- Wait for the reset (midnight UTC)
- Upgrade to managed cloud for unlimited traces
- Reduce trace volume (sample traces, filter low-priority calls)

### Dashboard shows "Failed to fetch"

1. Check the API service is running:

   ```bash
   curl http://localhost:8081/health
   ```

2. Verify `NEXT_PUBLIC_API_URL` in `.env.docker`:

   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8081
   ```

3. Check CORS settings if accessing from a different origin

### Services won't start

Common issues:

- **Port conflicts:** Ports 3000, 5432, 6379, 4222, 8080, 8081, 8082 must be available
- **Insufficient memory:** Docker needs at least 4GB RAM
- **Disk space:** Ensure 10GB+ available

Check Docker resources:

```bash
docker stats
```

### How do I reset everything?

Stop and remove all data:

```bash
cd infra/docker
docker-compose down -v
docker-compose up -d
```

This will delete all traces, alerts, and baselines. Use with caution!

## Comparison

### How is Lumina different from LangSmith?

- **Lumina:** OTEL-first, built for backend engineers, infrastructure-grade architecture
- **LangSmith:** Tight LangChain integration, built for LangChain users, evaluation focus

### How is Lumina different from Langfuse?

- **Lumina:** 50k traces/day free (self-hosted), OTEL-native, real-time production focus
- **Langfuse:** Unlimited traces (self-hosted), OSS, prompt management focus

### How is Lumina different from Helicone?

- **Lumina:** End-to-end RAG tracing, cost+quality correlation, replay testing
- **Langfuse:** Gateway approach, simple cost tracking, quality monitoring

### How is Lumina different from Datadog?

- **Lumina:** Purpose-built for AI systems, semantic understanding, startup-friendly pricing
- **Datadog:** General APM adding LLM features, enterprise pricing ($100k+/year)

### Should I use Lumina or Phoenix?

- **Use Lumina if:** You want production alerting, cost correlation, backend engineer UX
- **Use Phoenix if:** You want pure OSS RAG evaluation, no managed option needed

## Still Have Questions?

- 📖 [Read the full documentation](https://use-lumina.github.io/Lumina)
- 💬 [Ask in GitHub Discussions](https://github.com/use-lumina/Lumina/discussions)
- 📧 [Email us](mailto:your-email@example.com)
- 🐛 [Report a bug](https://github.com/use-lumina/Lumina/issues)
