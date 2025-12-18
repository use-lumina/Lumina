# API Reference

Lumina provides OpenAPI/Swagger documentation for all APIs.

## View API Documentation

### Option 1: Swagger UI (Recommended)

Visit [Swagger Editor](https://editor.swagger.io/) and paste the contents of `docs/openapi.yaml` to view interactive API documentation.

Or use a local Swagger UI:

```bash
# Install swagger-ui-watcher
npm install -g swagger-ui-watcher

# Serve the docs
cd /Users/evansonigiri/Lumina
swagger-ui-watcher docs/openapi.yaml
```

### Option 2: View YAML Directly

The complete OpenAPI specification is available at: [`docs/openapi.yaml`](./openapi.yaml)

## Quick Overview

### Ingestion API (Port 9411)

**Base URL:** `http://localhost:9411`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/traces` | POST | Ingest traces (OpenTelemetry compatible) |
| `/health` | GET | Health check |

### Query API (Port 8081)

**Base URL:** `http://localhost:8081`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/traces` | GET | Query traces with filters |
| `/api/traces/{traceId}` | GET | Get specific trace |
| `/api/analytics/cost` | GET | Cost analytics |
| `/api/analytics/latency` | GET | Latency analytics |
| `/health` | GET | Health check |

### Replay Engine (Port 8082)

**Base URL:** `http://localhost:8082`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/replay/capture` | POST | Create replay set |
| `/replay/run` | POST | Execute replay |
| `/replay/{replayId}` | GET | Get replay status |
| `/replay/{replayId}/diff` | GET | Get diff results |
| `/replay` | GET | List replay sets |
| `/health` | GET | Health check |

## Authentication

Currently in MVP phase with no authentication. Production deployments should implement:
- API key authentication
- Rate limiting
- Request validation

## Error Handling

All APIs return errors in this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid parameters)
- `404` - Resource not found
- `500` - Internal server error

## Rate Limits

No rate limits in MVP. Recommended limits for production:
- 1000 requests per minute per API key (Ingestion)
- 100 requests per minute per API key (Query/Replay)

## Examples

See [QUICKSTART.md](./QUICKSTART.md) for complete usage examples with curl and code samples.