---
layout: default
title: API Reference
nav_order: 4
has_children: false
---

# API Reference

{: .no_toc }

Lumina provides OpenAPI/Swagger documentation for all APIs.

## Table of contents

{: .no_toc .text-delta }

1. TOC
   {:toc}

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

### Ingestion API (Port 8080)

**Base URL:** `http://localhost:8080`

| Endpoint     | Method | Description                              |
| ------------ | ------ | ---------------------------------------- |
| `/v1/traces` | POST   | Ingest traces (OpenTelemetry compatible) |
| `/health`    | GET    | Health check                             |

### Query API (Port 8081)

**Base URL:** `http://localhost:8081`

#### Authentication Endpoints

| Endpoint                | Method | Auth Required | Description                    |
| ----------------------- | ------ | ------------- | ------------------------------ |
| `/auth/login`           | POST   | No            | User login with email/password |
| `/auth/me`              | GET    | Yes           | Get current user information   |
| `/auth/change-password` | POST   | Yes           | Change user password           |
| `/auth/refresh`         | POST   | Yes           | Refresh JWT token              |

#### Data Endpoints

| Endpoint            | Method | Auth Required | Description               |
| ------------------- | ------ | ------------- | ------------------------- |
| `/traces`           | GET    | Yes           | Query traces with filters |
| `/traces/{traceId}` | GET    | Yes           | Get specific trace        |
| `/cost`             | GET    | Yes           | Cost analytics            |
| `/alerts`           | GET    | Yes           | Get alerts                |
| `/health`           | GET    | No            | Health check              |

### Replay Engine (Port 8082)

**Base URL:** `http://localhost:8082`

| Endpoint                  | Method | Description       |
| ------------------------- | ------ | ----------------- |
| `/replay/capture`         | POST   | Create replay set |
| `/replay/run`             | POST   | Execute replay    |
| `/replay/{replayId}`      | GET    | Get replay status |
| `/replay/{replayId}/diff` | GET    | Get diff results  |
| `/replay`                 | GET    | List replay sets  |
| `/health`                 | GET    | Health check      |

## Authentication

### Dashboard Authentication (JWT)

Dashboard endpoints require JWT bearer token authentication:

```bash
# Login to get JWT token
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'

# Use token in subsequent requests
curl http://localhost:8081/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Token Details:**

- Tokens expire after 7 days
- Include user ID, customer ID, and email
- Required for all data endpoints (traces, cost, alerts)
- Use `/auth/refresh` to get a new token before expiration

**Password Management:**

- Initial passwords are marked as temporary (`isTemporaryPassword: true`)
- Users must change temporary passwords on first login
- Passwords must be at least 8 characters
- Uses bcrypt hashing with cost factor 10

### API Key Authentication (Ingestion)

Ingestion API uses API key authentication for trace ingestion:

```bash
curl -X POST http://localhost:8080/v1/traces \
  -H "X-API-Key: lumina_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @trace.json
```

**Note:** For self-hosted deployments with `AUTH_REQUIRED=false`, API keys are optional. Traces without API keys will use `customerId='default'`.

**API Key Details:**

- Each customer has separate `live` and `test` environment keys
- Keys are prefixed with `lumina_live_` or `lumina_test_`
- Keys are generated during customer onboarding
- Contact admin to rotate keys

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
- `401` - Unauthorized (missing or invalid authentication)
- `404` - Resource not found
- `429` - Rate limit exceeded (50k traces/day for self-hosted)
- `500` - Internal server error

**Authentication Errors:**

- Missing token: `{"error": "Unauthorized", "message": "No token provided"}`
- Invalid token: `{"error": "Unauthorized", "message": "Invalid or expired token"}`
- Wrong password: `{"error": "Invalid email or password"}`

## Rate Limits

### Self-Hosted

**50,000 traces per day** - Resets at midnight UTC

When the limit is exceeded, the API returns:

```json
{
  "error": "Rate limit exceeded",
  "message": "Self-hosted deployment has reached the daily limit of 50000 traces. Limit resets at midnight UTC.",
  "limit": 50000,
  "current": 50123,
  "resetTime": "2026-01-22T00:00:00.000Z"
}
```

**HTTP Status:** `429 Too Many Requests`

Check your current usage in the ingestion logs:

```bash
docker-compose logs ingestion | grep "rate limit"
```

### Managed Cloud

Unlimited traces. No rate limits.

## Examples

See [QUICKSTART.md](./QUICKSTART.md) for complete usage examples with curl and code samples.
