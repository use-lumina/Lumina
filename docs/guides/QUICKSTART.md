# Lumina Quickstart Guide

Get started with Lumina in under 5 minutes. This guide will walk you through setting up Lumina's observability platform for your LLM applications.

## What is Lumina?

Lumina is a lightweight, open-source observability platform for LLM applications that provides:
- Real-time trace ingestion and storage
- Cost and latency tracking
- Regression testing with replay capabilities
- Query API for trace analysis
- Semantic similarity comparison

## Prerequisites

Before you begin, ensure you have:
- [Bun](https://bun.sh) v1.0+ installed
- PostgreSQL 14+ running locally or remotely
- Node.js 20+ (for Next.js examples)
- An Anthropic API key (for testing)

## Quick Setup

### 1. Clone and Install

```bash
git clone <your-repo-url> lumina
cd lumina
bun install
```

### 2. Configure Database

Create a PostgreSQL database named `lumina`:

```bash
createdb lumina
```

Set your database connection string as an environment variable:

```bash
export DATABASE_URL="postgres://username@localhost:5432/lumina"
```

### 3. Start Services

Lumina consists of three microservices:

```bash
# Terminal 1: Ingestion Service (Port 9411)
cd services/ingestion
bun run dev

# Terminal 2: Query API (Port 8081)
cd services/query
bun run dev

# Terminal 3: Replay Engine (Port 8082)
cd services/replay
bun run dev
```

### 4. Verify Services

Check that all services are running:

```bash
# Ingestion service
curl http://localhost:9411/health

# Query API
curl http://localhost:8081/health

# Replay Engine
curl http://localhost:8082/health
```

You should see `{"status":"healthy"}` responses from all services.

## Instrumenting Your Application

### Install the SDK

```bash
bun add @lumina/sdk
```

### Basic Integration

Here's a minimal example using the Anthropic SDK:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { initLumina } from '@lumina/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Lumina
const lumina = initLumina({
  api_key: 'lumina_test123_abc',
  endpoint: 'http://localhost:9411/v1/traces',
  service_name: 'my-app',
  customer_id: 'user_123',
  environment: 'development',
});

// Wrap your LLM calls with traceLLM()
async function chat(message: string) {
  const response = await lumina.traceLLM(
    async () => {
      return await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }],
      });
    },
    {
      name: 'chat',
      system: 'anthropic',
      prompt: message,
      tags: ['chat', 'test'],
      metadata: {
        userMessage: message,
      },
    }
  );

  return response.content[0]?.type === 'text'
    ? response.content[0].text
    : 'No response';
}

// Use it
const reply = await chat('Hello, how are you?');
console.log(reply);
```

### Try the Example App

We provide a complete Next.js example application:

```bash
cd examples/nextjs-rag

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start the app
bun run dev
```

Visit `http://localhost:3000` and start chatting. Your traces will automatically appear in Lumina.

## Querying Your Traces

Once you have traces flowing into Lumina, you can query them using the Query API:

### Get Recent Traces

```bash
curl "http://localhost:8081/api/traces?limit=10"
```

### Filter by Service

```bash
curl "http://localhost:8081/api/traces?service=my-app"
```

### Search by Tags

```bash
curl "http://localhost:8081/api/traces?tags=chat,test"
```

### Get Cost Analytics

```bash
curl "http://localhost:8081/api/analytics/cost?service=my-app&startDate=2024-01-01"
```

### Get Latency Analytics

```bash
curl "http://localhost:8081/api/analytics/latency?service=my-app&timeRange=24h"
```

## Running Replay Tests

Replay testing allows you to re-execute production traces to detect regressions:

### 1. Capture a Replay Set

```bash
curl -X POST http://localhost:8082/replay/capture \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Replay",
    "description": "Testing recent chat interactions",
    "traceIds": ["trace_abc123", "trace_def456"],
    "createdBy": "you@example.com"
  }'
```

### 2. Execute the Replay

```bash
curl -X POST http://localhost:8082/replay/run \
  -H "Content-Type: application/json" \
  -d '{
    "replayId": "replay_uuid_from_step_1"
  }'
```

### 3. View Results

```bash
# Get summary
curl "http://localhost:8082/replay/{replayId}"

# Get detailed diffs
curl "http://localhost:8082/replay/{replayId}/diff?limit=50"

# Filter to only changed responses
curl "http://localhost:8082/replay/{replayId}/diff?showOnlyChanges=true"
```

## Understanding the Architecture

Lumina consists of three main components:

1. **Ingestion Service** (Port 9411)
   - Receives traces via OpenTelemetry-compatible endpoints
   - Stores traces in PostgreSQL
   - Validates and enriches incoming data

2. **Query API** (Port 8081)
   - Provides REST API for querying traces
   - Analytics endpoints for cost and latency
   - Filtering by service, tags, date ranges

3. **Replay Engine** (Port 8082)
   - Captures sets of traces for replay testing
   - Re-executes prompts and compares results
   - Calculates similarity scores and cost deltas

All services share the same PostgreSQL database for centralized storage.

## Configuration Options

### SDK Configuration

```typescript
const lumina = initLumina({
  api_key: string,           // Your Lumina API key
  endpoint: string,          // Ingestion endpoint URL
  service_name: string,      // Name of your service
  customer_id?: string,      // Optional customer identifier
  environment?: string,      // e.g., 'production', 'staging'
  enabled?: boolean,         // Enable/disable tracing (default: true)
  debug?: boolean,           // Enable debug logging
});
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgres://user@host:5432/lumina"

# Service Ports (optional, uses defaults if not set)
INGESTION_PORT=9411
QUERY_PORT=8081
REPLAY_PORT=8082

# API Keys (for production)
LUMINA_API_KEY="your_key_here"
ANTHROPIC_API_KEY="your_anthropic_key"
```

## Next Steps

Now that you have Lumina up and running:

1. **Explore the API Reference** - See `docs/API_REFERENCE.md` for complete endpoint documentation
2. **Review Architecture** - See `docs/ARCHITECTURE.md` for system design details
3. **Troubleshooting** - See `docs/TROUBLESHOOTING.md` for common issues and solutions
4. **Integrate More Services** - Add Lumina tracing to your production applications

## Need Help?

- Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Review the [API Reference](./API_REFERENCE.md)
- See the [Architecture Diagram](./ARCHITECTURE.md)

## What's Next?

- Add alert thresholds for cost and latency spikes
- Set up baseline tracking for your services
- Configure webhooks for automated notifications
- Deploy to production

Happy observing!
