import { Hono } from 'hono';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  getDatabase,
  alerts,
  getAlertsWithFilters,
  getAlertWithTrace,
  updateAlertStatus,
} from '../database/client';
import { requireAuth, type AuthContext } from '../middleware/auth';

const app = new Hono();

/**
 * GET /alerts/stats
 * Get alert statistics
 */
app.get('/stats', requireAuth, async (c) => {
  try {
    const db = getDatabase();
    const customerId = c.get('customerId') as string;

    // Parse query parameters
    const { startTime, endTime } = c.req.query();

    // Validate time range - default to last 7 days
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get alert statistics
    const conditions = [
      eq(alerts.customerId, customerId),
      gte(alerts.timestamp, start),
      lte(alerts.timestamp, end),
    ];

    const stats = await db
      .select({
        totalAlerts: sql<number>`COUNT(*)::int`,
        highSeverity: sql<number>`COUNT(*) FILTER (WHERE ${alerts.severity} = 'HIGH')::int`,
        mediumSeverity: sql<number>`COUNT(*) FILTER (WHERE ${alerts.severity} = 'MEDIUM')::int`,
        lowSeverity: sql<number>`COUNT(*) FILTER (WHERE ${alerts.severity} = 'LOW')::int`,
        acknowledged: sql<number>`COUNT(*) FILTER (WHERE ${alerts.status} = 'acknowledged')::int`,
        unacknowledged: sql<number>`COUNT(*) FILTER (WHERE ${alerts.status} = 'pending')::int`,
        costSpikes: sql<number>`COUNT(*) FILTER (WHERE ${alerts.alertType} = 'cost_spike')::int`,
        qualityDrops: sql<number>`COUNT(*) FILTER (WHERE ${alerts.alertType} = 'quality_drop')::int`,
        combinedAlerts: sql<number>`COUNT(*) FILTER (WHERE ${alerts.alertType} = 'cost_and_quality')::int`,
      })
      .from(alerts)
      .where(and(...conditions));

    // Get alerts by service
    const byService = await db
      .select({
        serviceName: alerts.serviceName,
        alertCount: sql<number>`COUNT(*)::int`,
        highSeverity: sql<number>`COUNT(*) FILTER (WHERE ${alerts.severity} = 'HIGH')::int`,
        unacknowledged: sql<number>`COUNT(*) FILTER (WHERE ${alerts.status} = 'pending')::int`,
      })
      .from(alerts)
      .where(and(...conditions))
      .groupBy(alerts.serviceName)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    return c.json({
      stats: stats[0] || {
        totalAlerts: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        acknowledged: 0,
        unacknowledged: 0,
        costSpikes: 0,
        qualityDrops: 0,
        combinedAlerts: 0,
      },
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
    const db = getDatabase();
    const customerId = c.get('customerId') as string;

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

    // Use the query builder from @lumina/database
    const alertsList = await getAlertsWithFilters(db, {
      customerId,
      alertType: alertType as any,
      severity: severity as any,
      status: status as any,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get total count
    const conditions = [eq(alerts.customerId, customerId)];

    if (service) conditions.push(eq(alerts.serviceName, service));
    if (alertType) conditions.push(eq(alerts.alertType, alertType as any));
    if (severity) conditions.push(eq(alerts.severity, severity as any));
    if (status) conditions.push(eq(alerts.status, status as any));
    if (startTime) conditions.push(gte(alerts.timestamp, new Date(startTime)));
    if (endTime) conditions.push(lte(alerts.timestamp, new Date(endTime)));

    const countResult = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(alerts)
      .where(and(...conditions));

    const total = countResult[0]?.total || 0;

    return c.json({
      data: alertsList,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + alertsList.length < total,
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
 * Get alert details with trace information
 */
app.get('/:id', requireAuth, async (c) => {
  try {
    const alertId = c.req.param('id');
    const auth = c.get('auth') as AuthContext;
    const db = getDatabase();

    // Use the query builder that includes trace data
    const alert = await getAlertWithTrace(db, alertId);

    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    // Verify the alert belongs to this customer
    if (alert.customerId !== auth.customerId) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    return c.json(alert);
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
    const db = getDatabase();

    // Update alert status
    await updateAlertStatus(db, alertId, 'acknowledged');

    // Fetch updated alert
    const result = await db
      .select({
        alertId: alerts.alertId,
        status: alerts.status,
        acknowledgedAt: alerts.acknowledgedAt,
      })
      .from(alerts)
      .where(eq(alerts.alertId, alertId))
      .limit(1);

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
    const db = getDatabase();

    // Update alert status
    await updateAlertStatus(db, alertId, 'resolved');

    // Fetch updated alert
    const result = await db
      .select({
        alertId: alerts.alertId,
        status: alerts.status,
        acknowledgedAt: alerts.acknowledgedAt,
        resolvedAt: alerts.resolvedAt,
      })
      .from(alerts)
      .where(eq(alerts.alertId, alertId))
      .limit(1);

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
