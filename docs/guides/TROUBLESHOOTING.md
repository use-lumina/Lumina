# Troubleshooting Guide

This guide covers common issues you might encounter when setting up and using Lumina.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Connection Issues](#database-connection-issues)
- [Service Startup Issues](#service-startup-issues)
- [Trace Ingestion Issues](#trace-ingestion-issues)
- [Query API Issues](#query-api-issues)
- [Replay Engine Issues](#replay-engine-issues)
- [SDK Integration Issues](#sdk-integration-issues)
- [Performance Issues](#performance-issues)

---

## Installation Issues

### Problem: `bun: command not found`

**Symptoms:**

```bash
$ bun install
bash: bun: command not found
```

**Solution:**
Install Bun by running:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then restart your terminal or run:

```bash
source ~/.bashrc  # or ~/.zshrc
```

**Verification:**

```bash
bun --version
```

---

### Problem: Package installation fails

**Symptoms:**

```bash
$ bun install
error: unable to resolve dependency
```

**Solution:**

1. Clear Bun cache:

```bash
rm -rf ~/.bun/install/cache
```

2. Delete node_modules and lockfile:

```bash
rm -rf node_modules bun.lockb
```

3. Reinstall:

```bash
bun install
```

---

## Database Connection Issues

### Problem: `database "lumina" does not exist`

**Symptoms:**

```
Failed to connect to database: database "lumina" does not exist
```

**Solution:**
Create the database:

```bash
createdb lumina
```

Or using psql:

```bash
psql postgres
CREATE DATABASE lumina;
\q
```

**Verification:**

```bash
psql -d lumina -c "SELECT 1"
```

---

### Problem: PostgreSQL connection refused

**Symptoms:**

```
Failed to connect to database: connection refused
ECONNREFUSED localhost:5432
```

**Solution:**

1. Check if PostgreSQL is running:

```bash
# macOS
brew services list | grep postgresql

# Linux
systemctl status postgresql
```

2. Start PostgreSQL if not running:

```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

3. Verify port 5432 is listening:

```bash
lsof -i :5432
```

---

### Problem: Authentication failed for user

**Symptoms:**

```
PostgresError: password authentication failed for user "username"
```

**Solution:**

1. Check your connection string in environment:

```bash
echo $DATABASE_URL
```

2. Update with correct credentials:

```bash
export DATABASE_URL="postgres://username:password@localhost:5432/lumina"
```

3. For local development without password:

```bash
export DATABASE_URL="postgres://username@localhost:5432/lumina"
```

---

### Problem: Table already exists error

**Symptoms:**

```
PostgresError: relation "traces" already exists
```

**Solution:**
This is usually harmless. Tables are created with `IF NOT EXISTS` clause. If you need to reset:

```bash
psql -d lumina -c "DROP TABLE IF EXISTS replay_results CASCADE; DROP TABLE IF EXISTS replay_sets CASCADE; DROP TABLE IF EXISTS traces CASCADE;"
```

Then restart the services to recreate tables.

---

## Service Startup Issues

### Problem: Port already in use

**Symptoms:**

```
Error: listen EADDRINUSE: address already in use :::9411
```

**Solution:**

1. Find the process using the port:

```bash
# macOS/Linux
lsof -i :9411

# Or use netstat
netstat -tuln | grep 9411
```

2. Kill the process:

```bash
kill -9 <PID>
```

3. Or change the port:

```bash
# For ingestion service
PORT=9412 bun run dev

# For query service
cd services/query
PORT=8090 bun run dev

# For replay service
cd services/replay
PORT=8091 bun run dev
```

---

### Problem: Service crashes immediately

**Symptoms:**

```bash
$ bun run dev
🚀 Starting service...
[ERROR] Uncaught Error: ...
```

**Solution:**

1. Check logs for specific error message
2. Verify DATABASE_URL is set:

```bash
echo $DATABASE_URL
```

3. Ensure database is accessible:

```bash
psql -d lumina -c "SELECT 1"
```

4. Check for missing dependencies:

```bash
bun install
```

---

### Problem: Database tables not created

**Symptoms:**
Service starts but queries fail with "relation does not exist"

**Solution:**

1. Check that `initialize()` is called on startup
2. Manually create tables:

```sql
-- Connect to database
psql -d lumina

-- For ingestion service (traces table)
-- See /services/ingestion/src/database/postgres.ts for schema

-- For replay service (replay tables)
-- See /services/replay/src/database/postgres.ts for schema
```

3. Restart the service after table creation

---

## Trace Ingestion Issues

### Problem: Traces not appearing in database

**Symptoms:**
SDK sends traces but database remains empty

**Diagnostic Steps:**

1. Check ingestion service logs:

```bash
cd services/ingestion
bun run dev
# Look for incoming requests
```

2. Test ingestion directly:

```bash
curl -X POST http://localhost:9411/v1/traces \
  -H "Content-Type: application/json" \
  -d '[{
    "traceId": "test123",
    "spanId": "span123",
    "serviceName": "test",
    "name": "test-trace",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }]'
```

3. Check database:

```bash
psql -d lumina -c "SELECT COUNT(*) FROM traces;"
```

**Common Causes:**

- Wrong ingestion endpoint in SDK config
- Ingestion service not running
- Database connection issue
- Validation errors in trace data

---

### Problem: Invalid trace format error

**Symptoms:**

```json
{
  "error": "Invalid trace format",
  "message": "Missing required fields"
}
```

**Solution:**
Ensure your traces include required fields:

```typescript
{
  traceId: string,
  spanId: string,
  serviceName: string,
  name: string,
  timestamp: string (ISO 8601)
}
```

Check SDK configuration:

```typescript
const lumina = initLumina({
  endpoint: 'http://localhost:9411/v1/traces',
  service_name: 'my-app', // Required
});
```

---

### Problem: Cost not calculated

**Symptoms:**
Traces ingested but `cost_usd` is 0 or null

**Solution:**

1. Ensure token counts are provided in trace attributes:

```typescript
{
  attributes: {
    'llm.usage.prompt_tokens': 100,
    'llm.usage.completion_tokens': 50,
    'llm.model': 'claude-sonnet-4-5'
  }
}
```

2. Check if model is supported in cost calculator:

```typescript
// See packages/core/src/cost-calculator.ts
```

3. Verify cost calculation is enabled in ingestion service

---

## Query API Issues

### Problem: Query returns empty results

**Symptoms:**

```bash
curl "http://localhost:8081/api/traces"
# Returns: {"data": [], "pagination": {...}}
```

**Diagnostic Steps:**

1. Check if traces exist:

```bash
psql -d lumina -c "SELECT COUNT(*) FROM traces;"
```

2. Check query filters:

```bash
# Try without filters
curl "http://localhost:8081/api/traces?limit=10"

# Check specific service
curl "http://localhost:8081/api/traces?service=my-app"
```

3. Check date range (default might exclude your traces):

```bash
curl "http://localhost:8081/api/traces?startDate=2024-01-01"
```

---

### Problem: Query API returns 500 error

**Symptoms:**

```json
{
  "error": "Internal server error",
  "message": "..."
}
```

**Solution:**

1. Check Query service logs for detailed error
2. Verify database connection:

```bash
psql -d lumina -c "SELECT 1"
```

3. Check for SQL syntax errors in filters
4. Ensure indexes exist for query performance

---

### Problem: Analytics returns incorrect values

**Symptoms:**
Cost or latency analytics show unexpected numbers

**Solution:**

1. Verify data in database:

```sql
psql -d lumina

-- Check cost data
SELECT service_name, AVG(cost_usd), SUM(cost_usd)
FROM traces
GROUP BY service_name;

-- Check latency data
SELECT service_name, AVG(latency_ms)
FROM traces
GROUP BY service_name;
```

2. Check for null values:

```sql
SELECT COUNT(*) FROM traces WHERE cost_usd IS NULL;
SELECT COUNT(*) FROM traces WHERE latency_ms IS NULL;
```

3. Verify aggregation logic in Query service code

---

## Replay Engine Issues

### Problem: Replay set creation fails

**Symptoms:**

```json
{
  "error": "Invalid traces",
  "message": "Found 0 of 5 traces"
}
```

**Solution:**

1. Verify trace IDs exist:

```bash
psql -d lumina -c "SELECT trace_id FROM traces LIMIT 10;"
```

2. Use exact trace_id values from database:

```bash
curl -X POST http://localhost:8082/replay/capture \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Replay",
    "traceIds": ["actual-trace-id-from-db"]
  }'
```

---

### Problem: Replay execution fails

**Symptoms:**
Replay status shows "failed" or execution hangs

**Diagnostic Steps:**

1. Check replay service logs
2. Verify traces have all required fields:

```sql
SELECT trace_id, span_id, prompt, response
FROM traces
WHERE trace_id = 'your-trace-id';
```

3. Check for null prompts or responses:

```sql
SELECT COUNT(*) FROM traces
WHERE prompt IS NULL OR response IS NULL;
```

**Solution:**

- Ensure original traces have complete data
- Check for API rate limits if calling external LLM APIs
- Verify LLM API credentials are configured

---

### Problem: Diff results show 0 similarity

**Symptoms:**
All replays show hash_similarity = 0

**Solution:**

1. Check if responses are being captured:

```sql
SELECT original_response, replay_response
FROM replay_results
LIMIT 1;
```

2. Verify Diff Engine is working:

```typescript
// Test similarity calculation
import { textSimilarity } from '@lumina/core';
const score = textSimilarity('hello', 'hello');
console.log(score); // Should be 1.0
```

3. Check for encoding issues in text comparison

---

### Problem: Foreign key constraint error

**Symptoms:**

```
PostgresError: there is no unique constraint matching given keys for referenced table
```

**Solution:**
This was fixed in the codebase. If you still see this:

1. Ensure replay_results table uses composite foreign key:

```sql
FOREIGN KEY (trace_id, span_id)
REFERENCES traces(trace_id, span_id)
```

2. Verify trace_ids in replay_sets are TEXT[] not UUID[]:

```sql
ALTER TABLE replay_sets
ALTER COLUMN trace_ids TYPE TEXT[]
USING trace_ids::TEXT[];
```

---

## SDK Integration Issues

### Problem: Traces not sent from application

**Symptoms:**
Application runs but no traces appear in Lumina

**Diagnostic Steps:**

1. Enable debug logging:

```typescript
const lumina = initLumina({
  debug: true,
  // ...other config
});
```

2. Check network requests in application logs
3. Verify endpoint is reachable:

```bash
curl http://localhost:9411/health
```

**Solution:**

- Check firewall rules
- Ensure ingestion service is running
- Verify endpoint URL is correct (no typos)
- Check for CORS issues if calling from browser

---

### Problem: TypeScript errors with SDK

**Symptoms:**

```
Type 'X' is not assignable to type 'Y'
```

**Solution:**

1. Ensure @lumina/sdk is properly installed:

```bash
bun add @lumina/sdk
```

2. Check TypeScript version compatibility:

```bash
bun add -D typescript@latest
```

3. Import types correctly:

```typescript
import { initLumina, type LuminaConfig } from '@lumina/sdk';
```

---

### Problem: Token counts not captured

**Symptoms:**
Traces ingested but prompt_tokens and completion_tokens are null

**Solution:**

1. For Anthropic SDK, tokens are in response.usage:

```typescript
const response = await anthropic.messages.create({...});
console.log(response.usage); // { input_tokens, output_tokens }
```

2. Lumina SDK automatically extracts these. If not working:

```typescript
// Manually pass token info
await lumina.traceLLM(async () => response, {
  name: 'test',
  system: 'anthropic',
  prompt: '...',
  metadata: {
    tokens: {
      prompt: response.usage.input_tokens,
      completion: response.usage.output_tokens,
    },
  },
});
```

---

## Performance Issues

### Problem: Slow trace ingestion

**Symptoms:**
Traces take several seconds to ingest

**Solutions:**

1. Check database performance:

```sql
-- Check for missing indexes
\d traces

-- Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp);
CREATE INDEX IF NOT EXISTS idx_traces_service ON traces(service_name);
```

2. Optimize database connection pool:

```typescript
// In database/postgres.ts
this.sql = postgres(this.connectionString, {
  max: 20, // Increase pool size
  idle_timeout: 20,
  connect_timeout: 10,
});
```

3. Consider async ingestion (future enhancement)

---

### Problem: Slow query performance

**Symptoms:**
API queries take > 2 seconds to return

**Solutions:**

1. Add database indexes:

```sql
CREATE INDEX idx_traces_service ON traces(service_name);
CREATE INDEX idx_traces_model ON traces(model);
CREATE INDEX idx_traces_timestamp ON traces(timestamp DESC);
CREATE INDEX idx_traces_cost ON traces(cost_usd);
CREATE INDEX idx_traces_latency ON traces(latency_ms);
```

2. Reduce query limit:

```bash
curl "http://localhost:8081/api/traces?limit=20"
```

3. Use more specific filters:

```bash
# Instead of querying all traces
curl "http://localhost:8081/api/traces"

# Query specific service and date range
curl "http://localhost:8081/api/traces?service=my-app&startDate=2024-01-15"
```

4. Implement pagination properly:

```bash
# Page through results
curl "http://localhost:8081/api/traces?limit=50&offset=0"
curl "http://localhost:8081/api/traces?limit=50&offset=50"
```

---

### Problem: High memory usage

**Symptoms:**
Services consume excessive RAM

**Solutions:**

1. Reduce connection pool size:

```typescript
postgres(connectionString, {
  max: 5, // Reduce from 10
});
```

2. Implement pagination in queries
3. Add memory limits to Bun process:

```bash
NODE_OPTIONS="--max-old-space-size=512" bun run dev
```

4. Archive old traces:

```sql
-- Move old traces to archive table
CREATE TABLE traces_archive AS
SELECT * FROM traces
WHERE timestamp < NOW() - INTERVAL '30 days';

DELETE FROM traces
WHERE timestamp < NOW() - INTERVAL '30 days';
```

---

## Getting Help

If you've tried these solutions and still have issues:

1. **Check logs** - Enable debug logging in all services
2. **Search GitHub Issues** - Someone may have encountered the same issue
3. **Create an Issue** - Include:
   - Error messages (full stack trace)
   - Steps to reproduce
   - Environment details (OS, Bun version, PostgreSQL version)
   - Relevant configuration

## Related Documentation

- [Quickstart Guide](./QUICKSTART.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture](./ARCHITECTURE.md)
