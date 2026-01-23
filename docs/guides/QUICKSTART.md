---
layout: default
title: Quickstart Guide
parent: Getting Started
nav_order: 1
---

# Lumina Quickstart Guide

{: .no_toc }

Get Lumina running locally in 5 minutes with Docker Compose.
{: .fs-6 .fw-300 }

## What is Lumina?

Lumina is an open-source, OpenTelemetry-native observability platform for AI systems that provides:

- ✅ **Real-time trace ingestion** - Track every LLM call
- ✅ **Cost & quality monitoring** - Get alerted on spikes and drops
- ✅ **Replay testing** - Re-run production traces safely
- ✅ **Semantic diff** - Understand response changes
- ✅ **All features included** - Free forever, self-hosted

## Self-Hosted Limits

The free self-hosted tier includes:

- **50,000 traces per day** - Resets daily at midnight UTC
- **7-day retention** - Traces older than 7 days are automatically deleted
- **All features** - Alerts, replay testing, semantic scoring, and more

For unlimited traces and longer retention, consider our managed cloud offering.

## Prerequisites

Before you start, ensure you have:

- **Docker & Docker Compose** installed ([Get Docker](https://docs.docker.com/get-docker/))
- **4GB RAM** minimum
- **Ports available:** 3000, 5432, 6379, 4222, 8080, 8081, 8082

Check Docker is installed:

```bash
docker --version
docker-compose --version
```

### Optional: API Keys for Replay Feature

To use the **replay feature with real LLM calls**, you'll need API keys:

- **Anthropic API key** - For Claude models ([Get from console.anthropic.com](https://console.anthropic.com/))
- **OpenAI API key** - For GPT models ([Get from platform.openai.com](https://platform.openai.com/api-keys))

> **Note:** These API keys are **only required for the replay feature**. All other features (trace ingestion, alerts, cost monitoring) work without API keys.

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/use-lumina/Lumina.git
cd Lumina
```

### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.docker.example .env.docker

# Edit configuration
nano .env.docker  # or use your preferred editor
```

**Required configuration:**

```bash
# Generate with: openssl rand -base64 32
JWT_SECRET=your-generated-secret-here
```

To generate a JWT secret:

```bash
openssl rand -base64 32
```

**Optional: LLM API Keys (for Replay Feature)**

Add these to enable the replay feature with real LLM calls:

```bash
# For Claude models (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# For GPT models (OpenAI)
OPENAI_API_KEY=sk-your-key-here
```

Without these keys, the replay feature will run in simulation mode (for testing without API costs).

**Authentication Mode:**

```bash
# Self-hosted (default) - No user authentication required
AUTH_REQUIRED=false

# Managed cloud - User authentication required
AUTH_REQUIRED=true
```

> **Note:** Self-hosted defaults to `AUTH_REQUIRED=false`, meaning no user authentication is required. All traces use `customerId='default'`.

### Step 3: Start Lumina

```bash
cd infra/docker
docker-compose --env-file ../../.env.docker up -d
```

This will:

- Pull required Docker images (PostgreSQL, Redis, NATS)
- Build Lumina services (ingestion, API, replay, dashboard)
- Run database migrations automatically
- Start all services in the background

**First-time setup takes 2-5 minutes** depending on your internet speed.

### Step 4: Verify Services

Check all services are running:

```bash
docker-compose ps
```

You should see all services with status `Up (healthy)`:

```
NAME                 STATUS
lumina-postgres      Up (healthy)
lumina-redis         Up (healthy)
lumina-nats          Up (healthy)
lumina-ingestion     Up (healthy)
lumina-api           Up (healthy)
lumina-replay        Up (healthy)
lumina-dashboard     Up (healthy)
```

Check service logs:

```bash
docker-compose logs -f
```

Look for:

```
ingestion_1  | ✅ Database initialized successfully
ingestion_1  | ✅ NATS initialized successfully
ingestion_1  | ✅ Redis cache initialized successfully
dashboard_1  | ✓ Ready in 3.2s
```

### Step 5: Access the Dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the Lumina dashboard! 🎉

## Send Your First Trace

Now let's send a test trace to see Lumina in action.

### Option 1: Using the SDK (Recommended)

**Install the SDK:**

```bash
npm install @uselumina/sdk
# or
bun add @uselumina/sdk
```

**Send a trace:**

```typescript
import { Lumina } from '@uselumina/sdk';

// Initialize Lumina client
const lumina = new Lumina({
  apiKey: 'test-key',
  endpoint: 'http://localhost:8080/v1/traces',
  environment: 'live',
  // Note: For self-hosted, API key is optional (auth disabled by default)
});

// Track an LLM call
await lumina.traceLLM({
  provider: 'openai',
  model: 'gpt-4',
  prompt: 'What is the capital of France?',
  response: 'The capital of France is Paris.',
  promptTokens: 10,
  completionTokens: 8,
  totalTokens: 18,
  latencyMs: 1234,
  costUsd: 0.0018,
  metadata: {
    userId: 'user-123',
    sessionId: 'session-456',
  },
});

console.log('✅ Trace sent to Lumina!');
```

### Option 2: Using cURL

```bash
curl -X POST http://localhost:8080/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "trace-001",
    "span_id": "span-001",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "service_name": "quickstart-test",
    "endpoint": "/api/chat",
    "provider": "openai",
    "model": "gpt-4",
    "prompt": "What is the capital of France?",
    "response": "The capital of France is Paris.",
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18,
    "latency_ms": 1234,
    "cost_usd": 0.0018,
    "status": "success",
    "environment": "live"
  }'
```

> **Note:** For self-hosted, authentication is disabled by default. No API key needed!

### Step 6: View Your Trace

1. Go to http://localhost:3000
2. Click on **Traces** in the sidebar
3. You should see your test trace appear!

## Next Steps

### 1. Instrument Your Application

See our integration guides:

- [OpenAI Integration](./INTEGRATIONS.md#openai)
- [Anthropic Integration](./INTEGRATIONS.md#anthropic)
- [LangChain Integration](./INTEGRATIONS.md#langchain)

### 2. Set Up Alerts

Cost spikes and quality drops are automatically detected! View them at:

```
http://localhost:3000/alerts
```

### 3. Try the Replay Feature

Replay lets you re-run production traces to test changes:

```typescript
// Capture a baseline
await lumina.createReplaySet({
  name: 'Production baseline',
  description: 'Captured before prompt change',
  sampleSize: 100,
});

// After making changes, replay the traces
await lumina.replayTraces({
  replaySetId: 'replay-set-id',
  // Lumina automatically compares old vs new responses
});
```

View replay results at: http://localhost:3000/replay

### 4. Explore the API

Key endpoints:

- `GET /traces` - List traces
- `GET /traces/:id` - Get trace details
- `GET /alerts` - List alerts
- `GET /cost` - Cost analytics
- `POST /replay` - Create replay sets

## Common Issues

### Port Already in Use

If you see "port is already allocated":

```bash
# Check what's using the port
lsof -i :3000  # or :5432, :8080, etc.

# Stop the conflicting service or change Lumina's ports in .env.docker
```

### Services Not Starting

Check Docker resources:

- Docker Desktop → Settings → Resources
- Memory: Set to at least 4GB
- Disk: Ensure 10GB+ available

### Database Connection Errors

Wait for PostgreSQL to be fully ready:

```bash
docker-compose logs postgres | grep "ready to accept connections"
```

If migrations fail:

```bash
# Restart the ingestion service
docker-compose restart ingestion

# Check logs
docker-compose logs ingestion
```

### Dashboard Shows "Failed to Fetch"

1. Check API is running:

```bash
curl http://localhost:8081/health
# Should return: {"status":"ok","service":"lumina-api"}
```

2. Verify `NEXT_PUBLIC_API_URL` in .env.docker:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8081
```

### Anthropic API Errors

If you see "Anthropic API key not set":

1. Check your .env.docker has the API key
2. Restart services:

```bash
docker-compose down
docker-compose up -d
```

## Stopping Lumina

```bash
# Stop all services (keeps data)
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## Data Persistence

Your data is stored in Docker volumes:

- **postgres-data**: All traces, alerts, baselines
- **redis-data**: Cached semantic scores
- **nats-data**: Message queue state

### Backup Your Data

```bash
# Create a backup
docker run --rm \
  -v docker_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/lumina-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## What's Next?

- 📖 [Architecture Overview](./ARCHITECTURE.md) - Understand how Lumina works
- 🔌 [Integration Guides](./INTEGRATIONS.md) - Connect your LLM applications
- 🚨 [Alert Configuration](./ALERTS.md) - Configure cost and quality alerts
- 🔁 [Replay Guide](./REPLAY.md) - Test changes safely
- ❓ [FAQ](./FAQ.md) - Common questions answered
- 🔧 [Troubleshooting](./TROUBLESHOOTING.md) - Fix common issues

## Need Help?

- 📝 [Documentation](https://use-lumina.github.io/Lumina)
- 💬 [GitHub Discussions](https://github.com/use-lumina/Lumina/discussions)
- 🐛 [Report an Issue](https://github.com/use-lumina/Lumina/issues)
- 🌟 [Star us on GitHub](https://github.com/use-lumina/Lumina)

---

**Free Forever • All Features Included**

Self-hosted Lumina includes all features with 50k traces/day and 7-day retention for $0. Need more? Upgrade to our managed cloud for unlimited traces and retention. Check out our [pricing page](https://yourdomain.com/pricing).
