import { Hono } from 'hono';
import { getDB } from '../database/postgres';

const app = new Hono();

/**
 * GET /traces
 * List traces with filters
 */
app.get('/', async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const {
      service,
      endpoint,
      model,
      status,
      startTime,
      endTime,
      limit = '100',
      offset = '0',
    } = c.req.query();

    // Build dynamic query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (service) {
      paramCount++;
      conditions.push(`service_name = $${paramCount}`);
      params.push(service);
    }

    if (endpoint) {
      paramCount++;
      conditions.push(`endpoint = $${paramCount}`);
      params.push(endpoint);
    }

    if (model) {
      paramCount++;
      conditions.push(`model = $${paramCount}`);
      params.push(model);
    }

    if (status) {
      paramCount++;
      conditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (startTime) {
      paramCount++;
      conditions.push(`timestamp >= $${paramCount}`);
      params.push(new Date(startTime));
    }

    if (endTime) {
      paramCount++;
      conditions.push(`timestamp <= $${paramCount}`);
      params.push(new Date(endTime));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Execute query with pagination
    const traces = await sql.unsafe(
      `
      SELECT
        trace_id,
        span_id,
        customer_id,
        service_name,
        endpoint,
        model,
        status,
        latency_ms,
        cost_usd,
        prompt_tokens,
        completion_tokens,
        timestamp,
        environment
      FROM traces
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get total count for pagination
    const countResult = await sql.unsafe(
      `
      SELECT COUNT(*) as total
      FROM traces
      ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult[0]?.total || '0');

    return c.json({
      data: traces,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + traces.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching traces:', error);
    return c.json(
      {
        error: 'Failed to fetch traces',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /traces/:id
 * Get full trace details
 */
app.get('/:id', async (c) => {
  try {
    const traceId = c.req.param('id');
    const db = getDB();
    const sql = db.getClient();

    // Fetch trace details
    const traces = await sql`
      SELECT
        trace_id,
        span_id,
        customer_id,
        service_name,
        endpoint,
        model,
        prompt,
        response,
        status,
        latency_ms,
        cost_usd,
        prompt_tokens,
        completion_tokens,
        timestamp,
        environment,
        metadata
      FROM traces
      WHERE trace_id = ${traceId}
      LIMIT 1
    `;

    if (traces.length === 0) {
      return c.json({ error: 'Trace not found' }, 404);
    }

    const trace = traces[0];

    // Fetch associated alerts
    const alerts = await sql`
      SELECT
        alert_id,
        alert_type,
        severity,
        current_cost,
        baseline_cost,
        cost_increase_percent,
        hash_similarity,
        semantic_score,
        scoring_method,
        semantic_cached,
        reasoning,
        timestamp,
        status,
        acknowledged_at,
        resolved_at
      FROM alerts
      WHERE trace_id = ${traceId}
      ORDER BY timestamp DESC
    `;

    return c.json({
      trace,
      alerts,
    });
  } catch (error) {
    console.error('Error fetching trace:', error);
    return c.json(
      {
        error: 'Failed to fetch trace',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
