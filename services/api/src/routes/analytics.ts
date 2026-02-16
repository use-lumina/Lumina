import { Hono } from 'hono';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import {
  getDatabase,
  getClient,
  getCostTimeline,
  getCostBreakdown,
  getEndpointTrends,
  getAnalyticsSummary,
  alerts as alertsTable,
  traces,
  costBaselines,
} from '../database/client';
import { requireAuth } from '../middleware/auth';

const app = new Hono();

/**
 * GET /analytics/timeline
 * Get time-series cost and usage data
 */
app.get('/timeline', requireAuth, async (c) => {
  try {
    const client = getClient();
    const customerId = c.get('customerId') as string;

    // Parse query parameters
    const {
      service,
      endpoint,
      model,
      startTime,
      endTime,
      granularity = 'hour', // hour, day, week, month
      environment,
    } = c.req.query();

    // Validate time range
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime ? new Date(startTime) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Validate granularity
    const validGranularities = ['hour', 'day', 'week', 'month'];
    const timeGranularity = validGranularities.includes(granularity) ? granularity : 'hour';

    // Get timeline data using raw postgres client
    // Convert Date objects to ISO strings before passing to query
    const timeline = await getCostTimeline(client, {
      customerId,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      granularity: timeGranularity as 'hour' | 'day' | 'week' | 'month',
      environment: environment as 'live' | 'test' | undefined,
    });

    // Convert to snake_case format for dashboard compatibility
    const timelineFormatted = timeline.map((point) => ({
      time_bucket:
        point.timeBucket instanceof Date ? point.timeBucket.toISOString() : point.timeBucket,
      request_count: point.count,
      total_cost: point.totalCost,
      avg_latency_ms: point.avgLatency,
      total_tokens: point.totalTokens,
    }));

    return c.json({
      data: timelineFormatted,
      filters: {
        service,
        endpoint,
        model,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        granularity: timeGranularity,
        environment,
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
 * GET /analytics/breakdown
 * Get cost breakdown by service, endpoint, model, or provider
 */
app.get('/breakdown', requireAuth, async (c) => {
  try {
    const db = getDatabase();
    const customerId = c.get('customerId') as string;

    // Parse query parameters
    const {
      groupBy = 'service_name',
      startTime,
      endTime,
      limit = '20',
      environment,
    } = c.req.query();

    // Validate time range
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Validate groupBy
    const validGroupBy = ['service_name', 'model', 'endpoint', 'provider'];
    const groupByColumn = validGroupBy.includes(groupBy) ? groupBy : 'service_name';

    // Get breakdown data
    const breakdown = await getCostBreakdown(db, {
      customerId,
      groupBy: groupByColumn as 'service_name' | 'model' | 'endpoint' | 'provider',
      startTime: start,
      endTime: end,
      limit: parseInt(limit),
      environment: environment as 'live' | 'test' | undefined,
    });

    // Calculate total cost for percentages
    const totalCost = breakdown.reduce((sum, item) => sum + item.totalCost, 0);

    // Convert to snake_case format for dashboard compatibility
    const enrichedBreakdown = breakdown.map((item) => ({
      group_name: item.dimension,
      request_count: item.count,
      total_cost: item.totalCost,
      avg_cost: item.totalCost / item.count,
      avg_latency: item.avgLatency,
      total_tokens: item.totalTokens,
      percentage: totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0,
    }));

    return c.json({
      data: enrichedBreakdown,
      summary: {
        totalCost,
        groupBy: groupByColumn,
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
 * GET /analytics/endpoint-trends
 * Get endpoint performance trends
 */
app.get('/endpoint-trends', requireAuth, async (c) => {
  try {
    const client = getClient();
    const customerId = c.get('customerId') as string;

    // Parse query parameters
    const { serviceName, startTime, endTime, limit = '20' } = c.req.query();

    // Validate time range
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get endpoint trends using raw postgres client
    const trends = await getEndpointTrends(client, {
      customerId,
      serviceName,
      startTime: start,
      endTime: end,
      limit: parseInt(limit),
    });

    // Convert to snake_case format for dashboard compatibility
    const formattedTrends = trends.map((item) => ({
      endpoint: item.endpoint,
      service_name: item.serviceName,
      model: item.model,
      total_requests: item.totalRequests,
      total_cost: item.totalCost,
      avg_cost: item.avgCost,
      avg_latency: item.avgLatency,
      error_rate: item.errorRate,
    }));

    return c.json({
      data: formattedTrends,
      filters: {
        serviceName,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
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

/**
 * GET /analytics/summary
 * Get overall analytics summary
 */
app.get('/summary', requireAuth, async (c) => {
  try {
    const db = getDatabase();
    const customerId = c.get('customerId') as string;

    // Parse query parameters
    const { startTime, endTime, environment } = c.req.query();

    // Validate time range
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get summary statistics
    const summaryData = await getAnalyticsSummary(db, {
      customerId,
      startTime: start,
      endTime: end,
      environment: environment as 'live' | 'test' | undefined,
    });

    // Get alert statistics
    const alertConditions = [
      eq(alertsTable.customerId, customerId),
      gte(alertsTable.timestamp, start),
      lte(alertsTable.timestamp, end),
    ];

    const alertStats = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        high: sql<number>`COUNT(*) FILTER (WHERE severity = 'HIGH')::int`,
        medium: sql<number>`COUNT(*) FILTER (WHERE severity = 'MEDIUM')::int`,
        low: sql<number>`COUNT(*) FILTER (WHERE severity = 'LOW')::int`,
        acknowledged: sql<number>`COUNT(*) FILTER (WHERE status = 'acknowledged' OR status = 'resolved')::int`,
      })
      .from(alertsTable)
      .where(and(...alertConditions));

    const alerts = alertStats[0] || { total: 0, high: 0, medium: 0, low: 0, acknowledged: 0 };

    // Return in dashboard-expected format with snake_case
    return c.json({
      summary: {
        total_requests: summaryData.totalRequests,
        total_cost: summaryData.totalCost,
        avg_cost: summaryData.avgCost,
        min_cost: 0, // TODO: Add to getAnalyticsSummary
        max_cost: 0, // TODO: Add to getAnalyticsSummary
        p50_cost: 0, // TODO: Add percentile calculations
        p95_cost: 0,
        p99_cost: 0,
        total_prompt_tokens: 0, // TODO: Add to getAnalyticsSummary
        total_completion_tokens: 0,
        avg_latency_ms: summaryData.avgLatency,
      },
      alerts: {
        total_alerts: alerts.total,
        high_severity: alerts.high,
        medium_severity: alerts.medium,
        low_severity: alerts.low,
        acknowledged: alerts.acknowledged,
      },
      timeRange: {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return c.json(
      {
        error: 'Failed to fetch analytics summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /analytics/anomalies
 * Get cost anomalies (traces that exceed baselines)
 */
app.get('/anomalies', requireAuth, async (c) => {
  try {
    const db = getDatabase();
    const customerId = c.get('customerId') as string;

    // Parse query parameters
    const { startTime, endTime, service, endpoint, limit = '50' } = c.req.query();

    // Validate time range
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime ? new Date(startTime) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Query for anomalies - traces with cost > 2x baseline p95
    const conditions = [
      eq(traces.customerId, customerId),
      gte(traces.timestamp, start),
      lte(traces.timestamp, end),
    ];

    if (service) {
      conditions.push(eq(traces.serviceName, service));
    }

    if (endpoint) {
      conditions.push(eq(traces.endpoint, endpoint));
    }

    const anomalies = await db
      .select({
        traceId: traces.traceId,
        spanId: traces.spanId,
        serviceName: traces.serviceName,
        endpoint: traces.endpoint,
        model: traces.model,
        costUsd: traces.costUsd,
        latencyMs: traces.latencyMs,
        timestamp: traces.timestamp,
        baselineP95: costBaselines.p95Cost,
        anomalyFactor: sql<number>`${traces.costUsd} / NULLIF(${costBaselines.p95Cost}, 0)`,
      })
      .from(traces)
      .leftJoin(
        costBaselines,
        and(
          eq(traces.serviceName, costBaselines.serviceName),
          eq(traces.endpoint, costBaselines.endpoint),
          eq(costBaselines.windowSize, '7d') // Use 7d baseline for more robust anomaly detection
        )
      )
      .where(
        and(...conditions, sql`${traces.costUsd} > 1.05 * COALESCE(${costBaselines.p95Cost}, 0)`)
      )
      .orderBy(desc(sql`${traces.costUsd} / NULLIF(${costBaselines.p95Cost}, 1)`))
      .limit(parseInt(limit));

    // Convert to snake_case and calculate cost_increase_percent
    const formattedAnomalies = anomalies.map((anomaly) => {
      const baselineCost = anomaly.baselineP95 || 0;
      const currentCost = anomaly.costUsd || 0;
      const costIncreasePercent =
        baselineCost > 0 ? ((currentCost - baselineCost) / baselineCost) * 100 : 0;

      return {
        trace_id: anomaly.traceId,
        span_id: anomaly.spanId,
        service_name: anomaly.serviceName,
        endpoint: anomaly.endpoint,
        model: anomaly.model,
        cost_usd: currentCost,
        latency_ms: anomaly.latencyMs,
        timestamp: anomaly.timestamp,
        baseline_cost: baselineCost,
        cost_increase_percent: Math.round(costIncreasePercent),
        anomaly_factor: anomaly.anomalyFactor,
      };
    });

    return c.json({
      data: formattedAnomalies,
      filters: {
        service,
        endpoint,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    return c.json(
      {
        error: 'Failed to fetch anomalies',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
