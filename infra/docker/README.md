# Lumina Docker Setup

Quick start guide for running Lumina self-hosted with Docker Compose.

## Prerequisites

- Docker & Docker Compose installed
- Anthropic API key (get from https://console.anthropic.com/)
- 4GB RAM minimum
- Ports available: 3000, 5432, 6379, 4222, 8080, 8081, 8082

## Quick Start

### 1. Set up environment variables

```bash
# From the root directory
cp .env.docker.example .env.docker

# Edit .env.docker and add your Anthropic API key
nano .env.docker
```

**Required:**

- `ANTHROPIC_API_KEY` - Get from https://console.anthropic.com/
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`

**Authentication (default for self-hosted):**

- `AUTH_REQUIRED=false` - API keys optional, uses 'default' customerId
- `AUTH_REQUIRED=true` - API keys required (for managed cloud)

### 2. Start all services

```bash
cd infra/docker
docker-compose --env-file ../../.env.docker up --build
```

Or use the shorthand:

```bash
cd infra/docker
docker-compose up -d  # Runs in background
```

### 3. Access the dashboard

Open http://localhost:3000 in your browser

### 4. Send your first trace

```typescript
import { Lumina } from '@lumina/sdk';

// For self-hosted, no API key needed!
const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
});

// Track an LLM call
await lumina.traceLLM({
  provider: 'openai',
  model: 'gpt-4',
  prompt: 'Hello world',
  response: 'Hi there!',
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  latencyMs: 1200,
  costUsd: 0.0015,
});
```

> **Note:** API key is optional for self-hosted. Omit it and tracing works automatically!

## Services

| Service    | Port | Description            |
| ---------- | ---- | ---------------------- |
| Dashboard  | 3000 | Web interface          |
| API        | 8081 | Query & management API |
| Ingestion  | 8080 | OTLP trace ingestion   |
| Replay     | 8082 | Test replay service    |
| PostgreSQL | 5432 | Database               |
| Redis      | 6379 | Cache                  |
| NATS       | 4222 | Message queue          |

## Useful Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f ingestion

# Stop all services
docker-compose down

# Stop and remove volumes (DELETES DATA)
docker-compose down -v

# Rebuild specific service
docker-compose up -d --build ingestion

# Check service status
docker-compose ps
```

## Troubleshooting

### Services won't start

Check if ports are already in use:

```bash
lsof -i :3000  # Dashboard
lsof -i :5432  # PostgreSQL
lsof -i :8080  # Ingestion
```

### Database connection errors

Wait for PostgreSQL to be healthy:

```bash
docker-compose logs postgres
```

Look for: "database system is ready to accept connections"

### Dashboard shows "Failed to fetch"

Check if API service is running:

```bash
curl http://localhost:8081/health
```

Should return: `{"status":"ok","service":"lumina-api"}`

### Migrations not running

Check ingestion service logs:

```bash
docker-compose logs ingestion | grep -i migration
```

### Out of memory

Increase Docker memory limit to at least 4GB:

- Docker Desktop → Settings → Resources → Memory

## Data Persistence

Data is stored in Docker volumes:

- `postgres-data` - All traces, alerts, replay data
- `redis-data` - Cached semantic scores
- `nats-data` - Message queue state

To backup:

```bash
docker run --rm -v docker_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/lumina-backup.tar.gz -C /data .
```

To restore:

```bash
docker run --rm -v docker_postgres-data:/data -v $(pwd):/backup alpine tar xzf /backup/lumina-backup.tar.gz -C /data
```

## Authentication Modes

### Self-Hosted Mode (Default: `AUTH_REQUIRED=false`)

**How it works:**

- API keys are **optional**
- Requests without auth header → `customerId='default'`
- Requests with auth header → validated normally
- Perfect for single-user or trusted environments

**Example:**

```typescript
// No API key needed
const lumina = new Lumina({
  endpoint: 'http://localhost:8080/v1/traces',
});
```

### Managed Cloud Mode (`AUTH_REQUIRED=true`)

**How it works:**

- API keys are **required**
- Requests without auth header → 401 Unauthorized
- All requests validated against customer database
- Multi-tenant isolation enforced

**Example:**

```typescript
// API key required
const lumina = new Lumina({
  apiKey: 'lumina_customer123_abc...',
  endpoint: 'https://api.lumina.dev/v1/traces',
});
```

## Production Deployment

For production, update:

1. `AUTH_REQUIRED` - Set to `true` for managed cloud, `false` for self-hosted
2. `JWT_SECRET` - Generate a strong secret
3. `CORS_ORIGIN` - Set to your domain
4. `NODE_ENV=production` - Already set
5. Database passwords - Change `lumina` defaults
6. Add HTTPS reverse proxy (Nginx/Caddy)
7. Set up automated backups
8. Configure monitoring/alerts

## Support

- GitHub Issues: https://github.com/yourusername/Lumina/issues
- Documentation: https://yourusername.github.io/Lumina
