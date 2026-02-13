import { Hono } from 'hono';
import { eq, and, gte, lte, desc, asc, isNull, sql, inArray } from 'drizzle-orm';
import { getDatabase, traces, alerts } from '../database/client';
import { requireAuth } from '../middleware/auth';

const app = new Hono();

/**
 * GET /traces
 * List traces with filters
 */
app.get('/', requireAuth, async (c) => {
  try {
    const db = getDatabase();

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

    // Build dynamic query conditions
    const conditions = [isNull(traces.parentSpanId)]; // Only root spans

    if (service) {
      conditions.push(eq(traces.serviceName, service));
    }

    if (endpoint) {
      conditions.push(eq(traces.endpoint, endpoint));
    }

    if (model) {
      conditions.push(eq(traces.model, model));
    }

    if (status) {
      conditions.push(eq(traces.status, status as any));
    }

    if (startTime) {
      conditions.push(gte(traces.timestamp, new Date(startTime)));
    }

    if (endTime) {
      conditions.push(lte(traces.timestamp, new Date(endTime)));
    }

    // Determine sort column and direction
    let sortColumn = traces.timestamp;
    if (sortBy === 'costUsd') sortColumn = traces.costUsd;
    else if (sortBy === 'latencyMs') sortColumn = traces.latencyMs;
    else if (sortBy === 'model') sortColumn = traces.model;
    else if (sortBy === 'endpoint') sortColumn = traces.endpoint;

    const sortDirection = sortOrder.toLowerCase() === 'asc' ? asc : desc;

    // Execute query with pagination
    const traceResults = await db
      .select({
        traceId: traces.traceId,
        spanId: traces.spanId,
        customerId: traces.customerId,
        serviceName: traces.serviceName,
        endpoint: traces.endpoint,
        model: traces.model,
        status: traces.status,
        latencyMs: traces.latencyMs,
        costUsd: traces.costUsd,
        promptTokens: traces.promptTokens,
        completionTokens: traces.completionTokens,
        timestamp: traces.timestamp,
        environment: traces.environment,
      })
      .from(traces)
      .where(and(...conditions))
      .orderBy(sortDirection(sortColumn))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Get total count for pagination
    const countResult = await db
      .select({ total: sql<number>`COUNT(DISTINCT ${traces.traceId})::int` })
      .from(traces)
      .where(and(...conditions));

    const total = countResult[0]?.total || 0;

    // Convert to snake_case for dashboard compatibility
    const formattedTraces = traceResults.map((trace) => ({
      trace_id: trace.traceId,
      span_id: trace.spanId,
      customer_id: trace.customerId,
      service_name: trace.serviceName,
      endpoint: trace.endpoint,
      model: trace.model,
      status: trace.status,
      latency_ms: trace.latencyMs,
      cost_usd: trace.costUsd,
      prompt_tokens: trace.promptTokens,
      completion_tokens: trace.completionTokens,
      timestamp: trace.timestamp,
      environment: trace.environment,
    }));

    return c.json({
      data: formattedTraces,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + traceResults.length < total,
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
    const db = getDatabase();

    // Parse query parameters
    const { startTime, endTime, service, endpoint, model, status } = c.req.query();

    // Calculate time periods
    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime ? new Date(startTime) : new Date(end.getTime() - 60 * 60 * 1000); // Default: last hour
    const periodDuration = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - periodDuration);
    const previousEnd = start;

    // Build filter conditions (excluding time range)
    const buildConditions = (timeStart: Date, timeEnd: Date) => {
      const conditions = [gte(traces.timestamp, timeStart), lte(traces.timestamp, timeEnd)];

      if (service) conditions.push(eq(traces.serviceName, service));
      if (endpoint) conditions.push(eq(traces.endpoint, endpoint));
      if (model) conditions.push(eq(traces.model, model));
      if (status) conditions.push(eq(traces.status, status as any));

      return conditions;
    };

    // Get current period metrics
    const currentMetrics = await db
      .select({
        totalRequests: sql<number>`COUNT(*)::int`,
        avgLatency: sql<number>`AVG(${traces.latencyMs})::float`,
        totalCost: sql<number>`SUM(${traces.costUsd})::float`,
        errorCount: sql<number>`COUNT(*) FILTER (WHERE ${traces.status} = 'error')::int`,
      })
      .from(traces)
      .where(and(...buildConditions(start, end)));

    // Get previous period metrics
    const previousMetrics = await db
      .select({
        totalRequests: sql<number>`COUNT(*)::int`,
        avgLatency: sql<number>`AVG(${traces.latencyMs})::float`,
        totalCost: sql<number>`SUM(${traces.costUsd})::float`,
        errorCount: sql<number>`COUNT(*) FILTER (WHERE ${traces.status} = 'error')::int`,
      })
      .from(traces)
      .where(and(...buildConditions(previousStart, previousEnd)));

    const current = currentMetrics[0] || {
      totalRequests: 0,
      avgLatency: 0,
      totalCost: 0,
      errorCount: 0,
    };
    const previous = previousMetrics[0] || {
      totalRequests: 0,
      avgLatency: 0,
      totalCost: 0,
      errorCount: 0,
    };

    // Calculate trends (percentage change)
    const calculateTrend = (currentVal: number, previousVal: number) => {
      if (!previousVal || previousVal === 0) return 0;
      return ((currentVal - previousVal) / previousVal) * 100;
    };

    const currentErrorRate =
      current.totalRequests > 0 ? (current.errorCount / current.totalRequests) * 100 : 0;
    const previousErrorRate =
      previous.totalRequests > 0 ? (previous.errorCount / previous.totalRequests) * 100 : 0;

    return c.json({
      current: {
        totalRequests: current.totalRequests,
        avgLatency: current.avgLatency,
        totalCost: current.totalCost,
        errorRate: currentErrorRate,
      },
      previous: {
        totalRequests: previous.totalRequests,
        avgLatency: previous.avgLatency,
        totalCost: previous.totalCost,
        errorRate: previousErrorRate,
      },
      trends: {
        requestsTrend: calculateTrend(current.totalRequests, previous.totalRequests),
        latencyTrend: calculateTrend(current.avgLatency, previous.avgLatency),
        costTrend: calculateTrend(current.totalCost, previous.totalCost),
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
 * Build a tree structure from flat spans
 */
interface SpanNode {
  traceId: string;
  spanId: string;
  parentSpanId?: string | null;
  customerId: string;
  serviceName: string;
  endpoint: string;
  model: string;
  prompt?: string | null;
  response?: string | null;
  status: string;
  latencyMs: number;
  costUsd?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  timestamp: Date;
  environment?: string | null;
  metadata?: any;
  children: SpanNode[];
}

/**
 * Convert SpanNode tree to snake_case format recursively
 */
function convertSpanToSnakeCase(span: SpanNode): any {
  return {
    trace_id: span.traceId,
    span_id: span.spanId,
    parent_span_id: span.parentSpanId,
    customer_id: span.customerId,
    service_name: span.serviceName,
    endpoint: span.endpoint,
    model: span.model,
    prompt: span.prompt,
    response: span.response,
    status: span.status,
    latency_ms: span.latencyMs,
    cost_usd: span.costUsd,
    prompt_tokens: span.promptTokens,
    completion_tokens: span.completionTokens,
    timestamp: span.timestamp,
    environment: span.environment,
    metadata: span.metadata,
    children: span.children.map(convertSpanToSnakeCase),
  };
}

function buildSpanTree(spans: any[]): SpanNode[] {
  // Create a map for quick lookup
  const spanMap = new Map<string, SpanNode>();
  const rootSpans: SpanNode[] = [];

  // Initialize all spans with empty children arrays
  spans.forEach((span) => {
    spanMap.set(span.spanId, {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      customerId: span.customerId,
      serviceName: span.serviceName,
      endpoint: span.endpoint,
      model: span.model,
      prompt: span.prompt,
      response: span.response,
      status: span.status,
      latencyMs: span.latencyMs,
      costUsd: span.costUsd,
      promptTokens: span.promptTokens,
      completionTokens: span.completionTokens,
      timestamp: span.timestamp,
      environment: span.environment,
      metadata: span.metadata,
      children: [],
    });
  });

  // Build parent-child relationships
  spans.forEach((span) => {
    const spanNode = spanMap.get(span.spanId)!;
    if (span.parentSpanId) {
      // Add to parent's children
      const parent = spanMap.get(span.parentSpanId);
      if (parent) {
        parent.children.push(spanNode);
      } else {
        // Parent not found in this trace, treat as root
        rootSpans.push(spanNode);
      }
    } else {
      // No parent, this is a root span
      rootSpans.push(spanNode);
    }
  });

  return rootSpans;
}

/**
 * GET /traces/:id
 * Get full trace details with hierarchical span structure
 */
app.get('/:id', requireAuth, async (c) => {
  try {
    const traceId = c.req.param('id');
    const db = getDatabase();

    // Fetch all spans for this trace
    const traceSpans = await db
      .select()
      .from(traces)
      .where(eq(traces.traceId, traceId))
      .orderBy(asc(traces.timestamp));

    if (traceSpans.length === 0) {
      return c.json({ error: 'Trace not found' }, 404);
    }

    // Build hierarchical trace structure
    const traceTree = buildSpanTree(traceSpans);

    // Get the primary trace (first root span)
    const trace = traceTree[0] || null;

    if (!trace) {
      return c.json({ error: 'Trace not found' }, 404);
    }

    // Fetch associated alerts for all spans in this trace
    const spanIds = traceSpans.map((s) => s.spanId);
    const traceAlerts = await db
      .select({
        alertId: alerts.alertId,
        alertType: alerts.alertType,
        severity: alerts.severity,
        currentCost: alerts.currentCost,
        baselineCost: alerts.baselineCost,
        costIncreasePercent: alerts.costIncreasePercent,
        hashSimilarity: alerts.hashSimilarity,
        semanticScore: alerts.semanticScore,
        reasoning: alerts.reasoning,
        timestamp: alerts.timestamp,
        status: alerts.status,
        spanId: alerts.spanId,
      })
      .from(alerts)
      .where(and(eq(alerts.traceId, traceId), inArray(alerts.spanId, spanIds)));

    // Convert to snake_case for dashboard compatibility
    const formattedTrace = convertSpanToSnakeCase(trace);
    const formattedAlerts = traceAlerts.map((alert) => ({
      alert_id: alert.alertId,
      alert_type: alert.alertType,
      severity: alert.severity,
      current_cost: alert.currentCost,
      baseline_cost: alert.baselineCost,
      cost_increase_percent: alert.costIncreasePercent,
      hash_similarity: alert.hashSimilarity,
      semantic_score: alert.semanticScore,
      reasoning: alert.reasoning,
      timestamp: alert.timestamp,
      status: alert.status,
      span_id: alert.spanId,
    }));

    return c.json({
      trace: formattedTrace,
      alerts: formattedAlerts,
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
