import { Hono } from 'hono';
import { getDB } from '../database/postgres';
import { requireAuth } from '../middleware/auth';

const app = new Hono();

/**
 * GET /traces
 * List traces with filters
 */
app.get('/', requireAuth, async (c) => {
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
      sortBy = 'timestamp',
      sortOrder = 'desc',
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

    // Validate and sanitize sortBy to prevent SQL injection
    const allowedSortColumns = ['timestamp', 'cost_usd', 'latency_ms', 'model', 'endpoint'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'timestamp';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

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
      ORDER BY ${sortColumn} ${sortDirection}
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
 * GET /traces/trends
 * Get trace metrics trends (current period vs previous period)
 */
app.get('/trends', requireAuth, async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const { startTime, endTime, service, endpoint, model, status } = c.req.query();

    // Calculate time periods
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime ? new Date(startTime) : new Date(end.getTime() - 60 * 60 * 1000); // Default: last hour
    const periodDuration = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodDuration);
    const previousEnd = start;

    // Build filter conditions
    const buildConditions = (timeStart: Date, timeEnd: Date) => {
      const conditions: string[] = [
        `timestamp >= '${timeStart.toISOString()}'`,
        `timestamp <= '${timeEnd.toISOString()}'`,
      ];
      if (service) conditions.push(`service_name = '${service}'`);
      if (endpoint) conditions.push(`endpoint = '${endpoint}'`);
      if (model) conditions.push(`model = '${model}'`);
      if (status) conditions.push(`status = '${status}'`);
      return conditions.join(' AND ');
    };

    const currentConditions = buildConditions(start, end);
    const previousConditions = buildConditions(previousStart, previousEnd);

    // Get current period metrics
    const currentMetrics = await sql.unsafe(`
      SELECT
        COUNT(*) as total_requests,
        AVG(latency_ms) as avg_latency,
        SUM(cost_usd) as total_cost,
        COUNT(*) FILTER (WHERE status != 'ok' AND status != 'healthy') as error_count
      FROM traces
      WHERE ${currentConditions}
    `);

    // Get previous period metrics
    const previousMetrics = await sql.unsafe(`
      SELECT
        COUNT(*) as total_requests,
        AVG(latency_ms) as avg_latency,
        SUM(cost_usd) as total_cost,
        COUNT(*) FILTER (WHERE status != 'ok' AND status != 'healthy') as error_count
      FROM traces
      WHERE ${previousConditions}
    `);

    const current = currentMetrics[0] || {
      total_requests: '0',
      avg_latency: '0',
      total_cost: '0',
      error_count: '0',
    };
    const previous = previousMetrics[0] || {
      total_requests: '0',
      avg_latency: '0',
      total_cost: '0',
      error_count: '0',
    };

    // Calculate trends (percentage change)
    const calculateTrend = (currentVal: number, previousVal: number) => {
      if (!previousVal || previousVal === 0) return 0;
      return ((currentVal - previousVal) / previousVal) * 100;
    };

    const currentRequests = parseInt(String(current.total_requests || '0'));
    const previousRequests = parseInt(String(previous.total_requests || '0'));
    const currentLatency = parseFloat(String(current.avg_latency || '0'));
    const previousLatency = parseFloat(String(previous.avg_latency || '0'));
    const currentCost = parseFloat(String(current.total_cost || '0'));
    const previousCost = parseFloat(String(previous.total_cost || '0'));
    const currentErrors = parseInt(String(current.error_count || '0'));
    const previousErrors = parseInt(String(previous.error_count || '0'));

    const currentErrorRate = currentRequests > 0 ? (currentErrors / currentRequests) * 100 : 0;
    const previousErrorRate = previousRequests > 0 ? (previousErrors / previousRequests) * 100 : 0;

    return c.json({
      current: {
        totalRequests: currentRequests,
        avgLatency: currentLatency,
        totalCost: currentCost,
        errorRate: currentErrorRate,
      },
      previous: {
        totalRequests: previousRequests,
        avgLatency: previousLatency,
        totalCost: previousCost,
        errorRate: previousErrorRate,
      },
      trends: {
        requestsTrend: calculateTrend(currentRequests, previousRequests),
        latencyTrend: calculateTrend(currentLatency, previousLatency),
        costTrend: calculateTrend(currentCost, previousCost),
        errorRateTrend: calculateTrend(currentErrorRate, previousErrorRate),
      },
      timeRange: {
        current: {
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
        previous: {
          startTime: previousStart.toISOString(),
          endTime: previousEnd.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching trace trends:', error);
    return c.json(
      {
        error: 'Failed to fetch trace trends',
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
app.get('/:id', requireAuth, async (c) => {
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
