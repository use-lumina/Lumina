import { Hono } from 'hono';
import { getDB } from '../database/postgres';
import { requireAuth, type AuthContext } from '../middleware/auth';

const app = new Hono();

/**
 * GET /alerts/stats
 * Get alert statistics
 */
app.get('/stats', requireAuth, async (c) => {
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

    // Get alert statistics
    const stats = await sql`
      SELECT
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'HIGH') as high_severity,
        COUNT(*) FILTER (WHERE severity = 'MEDIUM') as medium_severity,
        COUNT(*) FILTER (WHERE severity = 'LOW') as low_severity,
        COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
        COUNT(*) FILTER (WHERE status = 'pending') as unacknowledged,
        COUNT(*) FILTER (WHERE alert_type = 'cost_spike') as cost_spikes,
        COUNT(*) FILTER (WHERE alert_type = 'quality_drop') as quality_drops,
        COUNT(*) FILTER (WHERE alert_type = 'cost_and_quality') as combined_alerts
      FROM alerts
      WHERE timestamp >= ${start} AND timestamp <= ${end}
    `;

    // Get alerts by service
    const byService = await sql`
      SELECT
        service_name,
        COUNT(*) as alert_count,
        COUNT(*) FILTER (WHERE severity = 'HIGH') as high_severity,
        COUNT(*) FILTER (WHERE status = 'pending') as unacknowledged
      FROM alerts
      WHERE timestamp >= ${start} AND timestamp <= ${end}
      GROUP BY service_name
      ORDER BY alert_count DESC
      LIMIT 10
    `;

    return c.json({
      stats: stats[0],
      byService,
      timeRange: {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    return c.json(
      {
        error: 'Failed to fetch alert stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /alerts
 * List alerts with filters
 */
app.get('/', requireAuth, async (c) => {
  try {
    const db = getDB();
    const sql = db.getClient();

    // Parse query parameters
    const {
      service,
      alertType,
      severity,
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
      conditions.push(`a.service_name = $${++paramCount}`);
      params.push(service);
    }

    if (alertType) {
      conditions.push(`a.alert_type = $${++paramCount}`);
      params.push(alertType);
    }

    if (severity) {
      conditions.push(`a.severity = $${++paramCount}`);
      params.push(severity);
    }

    if (status) {
      conditions.push(`a.status = $${++paramCount}`);
      params.push(status);
    }

    if (startTime) {
      conditions.push(`a.timestamp >= $${++paramCount}`);
      params.push(new Date(startTime));
    }

    if (endTime) {
      conditions.push(`a.timestamp <= $${++paramCount}`);
      params.push(new Date(endTime));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Execute query
    const alerts = await sql.unsafe(
      `
      SELECT
        a.alert_id,
        a.trace_id,
        a.span_id,
        a.customer_id,
        a.alert_type,
        a.severity,
        a.current_cost,
        a.baseline_cost,
        a.cost_increase_percent,
        a.hash_similarity,
        a.semantic_score,
        a.scoring_method,
        a.semantic_cached,
        a.service_name,
        a.endpoint,
        a.model,
        a.reasoning,
        a.timestamp,
        a.status,
        a.acknowledged_at,
        a.resolved_at
      FROM alerts a
      ${whereClause}
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
      ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult[0]?.total || '0');

    return c.json({
      data: alerts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + alerts.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return c.json(
      {
        error: 'Failed to fetch alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /alerts/:id
 * Get alert details
 */
app.get('/:id', requireAuth, async (c) => {
  try {
    const alertId = c.req.param('id');
    const auth = c.get('auth') as AuthContext;
    const db = getDB();
    const sql = db.getClient();

    // Fetch alert with trace details
    const alerts = await sql`
      SELECT
        a.alert_id,
        a.trace_id,
        a.span_id,
        a.customer_id,
        a.alert_type,
        a.severity,
        a.current_cost,
        a.baseline_cost,
        a.cost_increase_percent,
        a.hash_similarity,
        a.semantic_score,
        a.scoring_method,
        a.semantic_cached,
        a.service_name,
        a.endpoint,
        a.model,
        a.reasoning,
        a.timestamp,
        a.status,
        a.acknowledged_at,
        a.resolved_at,
        t.prompt,
        t.response,
        t.cost_usd,
        t.latency_ms,
        t.prompt_tokens,
        t.completion_tokens,
        t.timestamp as trace_timestamp
      FROM alerts a
      LEFT JOIN traces t ON a.trace_id = t.trace_id AND a.span_id = t.span_id
      WHERE a.alert_id = ${alertId}
        AND a.customer_id = ${auth.customerId}
      LIMIT 1
    `;

    if (alerts.length === 0) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    return c.json(alerts[0]);
  } catch (error) {
    console.error('Error fetching alert:', error);
    return c.json(
      {
        error: 'Failed to fetch alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /alerts/:id/acknowledge
 * Acknowledge an alert
 */
app.post('/:id/acknowledge', requireAuth, async (c) => {
  try {
    const alertId = c.req.param('id');
    const db = getDB();
    const sql = db.getClient();

    // Update alert acknowledgment
    const result = await sql`
      UPDATE alerts
      SET
        status = 'acknowledged',
        acknowledged_at = NOW()
      WHERE alert_id = ${alertId}
      RETURNING alert_id, status, acknowledged_at
    `;

    if (result.length === 0) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    return c.json({
      success: true,
      alert: result[0],
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return c.json(
      {
        error: 'Failed to acknowledge alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /alerts/:id/resolve
 * Resolve an alert
 */
app.post('/:id/resolve', requireAuth, async (c) => {
  try {
    const alertId = c.req.param('id');
    const db = getDB();
    const sql = db.getClient();

    // Update alert resolution
    const result = await sql`
      UPDATE alerts
      SET
        status = 'resolved',
        resolved_at = NOW(),
        acknowledged_at = COALESCE(acknowledged_at, NOW())
      WHERE alert_id = ${alertId}
      RETURNING alert_id, status, acknowledged_at, resolved_at
    `;

    if (result.length === 0) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    return c.json({
      success: true,
      alert: result[0],
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    return c.json(
      {
        error: 'Failed to resolve alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
