import { Hono } from 'hono';
import { getDB } from '../database/postgres';
import { requireAuth } from '../middleware/auth';

const app = new Hono();

/**
 * GET /cost/timeline
 * Get time-series cost data
 */
app.get('/timeline', requireAuth, async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const {
      service,
      endpoint,
      model,
      startTime,
      endTime,
      granularity = 'hour', // hour, day, week
    } = c.req.query();

    // Validate time range
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime ? new Date(startTime) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Build conditions
    const conditions: string[] = ['timestamp >= $1', 'timestamp <= $2'];
    const params: any[] = [start, end];
    let paramCount = 2;

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

    const whereClause = conditions.join(' AND ');

    // Determine time bucket based on granularity
    const timeBucket =
      granularity === 'day'
        ? "date_trunc('day', timestamp)"
        : granularity === 'week'
          ? "date_trunc('week', timestamp)"
          : "date_trunc('hour', timestamp)";

    // Execute query
    const timeline = await sql.unsafe(
      `
      SELECT
        ${timeBucket} as time_bucket,
        COUNT(*) as request_count,
        SUM(cost_usd) as total_cost,
        AVG(cost_usd) as avg_cost,
        MIN(cost_usd) as min_cost,
        MAX(cost_usd) as max_cost,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        AVG(latency_ms) as avg_latency_ms,
        MIN(latency_ms) as min_latency_ms,
        MAX(latency_ms) as max_latency_ms
      FROM traces
      WHERE ${whereClause}
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `,
      params
    );

    return c.json({
      data: timeline,
      filters: {
        service,
        endpoint,
        model,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        granularity,
      },
    });
  } catch (error) {
    console.error('Error fetching cost timeline:', error);
    return c.json(
      {
        error: 'Failed to fetch cost timeline',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /cost/breakdown
 * Get cost breakdown by service, endpoint, or model
 */
app.get('/breakdown', requireAuth, async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const { groupBy = 'service', startTime, endTime, limit = '10' } = c.req.query();

    // Validate time range
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Determine grouping column
    const groupColumn =
      groupBy === 'endpoint'
        ? 'endpoint'
        : groupBy === 'model'
          ? 'model'
          : groupBy === 'customer'
            ? 'customer_id'
            : 'service_name';

    // Execute query
    const breakdown = await sql.unsafe(
      `
      SELECT
        ${groupColumn} as group_name,
        COUNT(*) as request_count,
        SUM(cost_usd) as total_cost,
        AVG(cost_usd) as avg_cost,
        MIN(cost_usd) as min_cost,
        MAX(cost_usd) as max_cost,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        AVG(latency_ms) as avg_latency_ms
      FROM traces
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY ${groupColumn}
      ORDER BY total_cost DESC
      LIMIT $3
    `,
      [start, end, parseInt(limit)]
    );

    // Calculate total for percentage
    const totalResult = await sql`
      SELECT SUM(cost_usd) as total_cost
      FROM traces
      WHERE timestamp >= ${start} AND timestamp <= ${end}
    `;

    const totalCost = parseFloat(totalResult[0]?.total_cost || '0');

    // Add percentage to each item
    const enrichedBreakdown = breakdown.map((item: any) => ({
      ...item,
      percentage: totalCost > 0 ? (parseFloat(item.total_cost) / totalCost) * 100 : 0,
    }));

    return c.json({
      data: enrichedBreakdown,
      summary: {
        totalCost,
        groupBy,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching cost breakdown:', error);
    return c.json(
      {
        error: 'Failed to fetch cost breakdown',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /cost/anomalies
 * Get recent cost anomalies (traces with alerts)
 */
app.get('/anomalies', requireAuth, async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const { service, severity, limit = '50', offset = '0' } = c.req.query();

    // Build conditions
    const conditions: string[] = ["alert_type IN ('cost_spike', 'cost_and_quality')"];
    const params: any[] = [];
    let paramCount = 0;

    if (service) {
      paramCount++;
      conditions.push(`t.service_name = $${paramCount}`);
      params.push(service);
    }

    if (severity) {
      paramCount++;
      conditions.push(`a.severity = $${paramCount}`);
      params.push(severity);
    }

    const whereClause = conditions.join(' AND ');

    // Execute query with join
    const anomalies = await sql.unsafe(
      `
      SELECT
        a.alert_id,
        a.trace_id,
        a.alert_type,
        a.severity,
        a.current_cost,
        a.baseline_cost,
        a.cost_increase_percent,
        a.reasoning,
        a.timestamp as alert_timestamp,
        a.status,
        t.service_name,
        t.endpoint,
        t.model,
        t.cost_usd,
        t.timestamp as trace_timestamp
      FROM alerts a
      JOIN traces t ON a.trace_id = t.trace_id
      WHERE ${whereClause}
      ORDER BY a.timestamp DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await sql.unsafe(
      `
      SELECT COUNT(*) as total
      FROM alerts a
      JOIN traces t ON a.trace_id = t.trace_id
      WHERE ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult[0]?.total || '0');

    return c.json({
      data: anomalies,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + anomalies.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching cost anomalies:', error);
    return c.json(
      {
        error: 'Failed to fetch cost anomalies',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /cost/summary
 * Get overall cost summary statistics
 */
app.get('/summary', requireAuth, async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const { startTime, endTime } = c.req.query();

    // Validate time range - default to last 7 days
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get overall statistics
    const summary = await sql`
      SELECT
        COUNT(*) as total_requests,
        SUM(cost_usd) as total_cost,
        AVG(cost_usd) as avg_cost,
        MIN(cost_usd) as min_cost,
        MAX(cost_usd) as max_cost,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cost_usd) as p50_cost,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY cost_usd) as p95_cost,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY cost_usd) as p99_cost,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        AVG(latency_ms) as avg_latency_ms
      FROM traces
      WHERE timestamp >= ${start} AND timestamp <= ${end}
    `;

    // Get alert statistics
    const alertStats = await sql`
      SELECT
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'HIGH') as high_severity,
        COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium_severity,
        COUNT(*) FILTER (WHERE severity = 'LOW') as low_severity,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged
      FROM alerts
      WHERE timestamp >= ${start} AND timestamp <= ${end}
        AND alert_type IN ('cost_spike', 'cost_and_quality')
    `;

    return c.json({
      summary: summary[0],
      alerts: alertStats[0],
      timeRange: {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching cost summary:', error);
    return c.json(
      {
        error: 'Failed to fetch cost summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /cost/endpoint-trends
 * Get cost trends for endpoints (current vs previous period)
 */
app.get('/endpoint-trends', requireAuth, async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const { startTime, endTime, limit = '20' } = c.req.query();

    // Validate time range
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const periodDuration = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodDuration);
    const previousEnd = start;

    // Get current period endpoint costs
    const currentPeriod = await sql.unsafe(
      `
      SELECT
        endpoint,
        COUNT(*) as request_count,
        SUM(cost_usd) as total_cost,
        AVG(cost_usd) as avg_cost
      FROM traces
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY endpoint
      ORDER BY total_cost DESC
      LIMIT $3
    `,
      [start, end, parseInt(limit)]
    );

    // Get previous period endpoint costs
    const previousPeriod = await sql.unsafe(
      `
      SELECT
        endpoint,
        SUM(cost_usd) as total_cost,
        AVG(cost_usd) as avg_cost
      FROM traces
      WHERE timestamp >= $1 AND timestamp <= $2
      GROUP BY endpoint
    `,
      [previousStart, previousEnd]
    );

    // Create a map for previous period data
    const previousMap = new Map();
    previousPeriod.forEach((item: any) => {
      previousMap.set(item.endpoint, {
        total_cost: parseFloat(item.total_cost || '0'),
        avg_cost: parseFloat(item.avg_cost || '0'),
      });
    });

    // Calculate trends
    const endpointsWithTrends = currentPeriod.map((item: any) => {
      const currentCost = parseFloat(item.total_cost || '0');
      const previous = previousMap.get(item.endpoint);
      const previousCost = previous?.total_cost || 0;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;

      if (previousCost > 0) {
        trendPercent = ((currentCost - previousCost) / previousCost) * 100;
        if (Math.abs(trendPercent) < 5) {
          trend = 'stable';
        } else if (trendPercent > 0) {
          trend = 'up';
        } else {
          trend = 'down';
        }
      } else if (currentCost > 0) {
        trend = 'up';
        trendPercent = 100;
      }

      return {
        endpoint: item.endpoint,
        request_count: parseInt(String(item.request_count || '0')),
        total_cost: currentCost,
        avg_cost: parseFloat(item.avg_cost || '0'),
        trend,
        trend_percent: trendPercent,
        previous_cost: previousCost,
      };
    });

    return c.json({
      data: endpointsWithTrends,
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
    console.error('Error fetching endpoint trends:', error);
    return c.json(
      {
        error: 'Failed to fetch endpoint trends',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
