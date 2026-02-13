import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import type { Database } from '../db';
import { traces } from '../schema';
import type postgres from 'postgres';

/**
 * Timeline data point for cost/usage over time
 */
export interface TimelineDataPoint {
  timeBucket: Date;
  count: number;
  totalCost: number;
  avgLatency: number;
  totalTokens: number;
}

/**
 * Get cost and usage timeline with date_trunc
 *
 * @example
 * ```typescript
 * const timeline = await getCostTimeline(db, {
 *   customerId: 'customer-123',
 *   startTime: new Date('2024-01-01'),
 *   endTime: new Date('2024-12-31'),
 *   granularity: 'day',
 * });
 * ```
 */
export async function getCostTimeline(
  client: postgres.Sql,
  options: {
    customerId: string;
    startTime: string; // ISO 8601 string
    endTime: string; // ISO 8601 string
    granularity: 'hour' | 'day' | 'week' | 'month';
    environment?: 'live' | 'test';
  }
): Promise<TimelineDataPoint[]> {
  // Use raw postgres client with template literals for full control
  // This avoids Drizzle's SQL generation issues with GROUP BY
  const { customerId, startTime, endTime, granularity, environment } = options;

  const result = environment
    ? await client`
      SELECT
        date_trunc(${granularity}, timestamp) as "timeBucket",
        COUNT(*)::int as count,
        COALESCE(SUM(cost_usd), 0)::float as "totalCost",
        COALESCE(AVG(latency_ms), 0)::float as "avgLatency",
        COALESCE(SUM(tokens), 0)::int as "totalTokens"
      FROM traces
      WHERE customer_id = ${customerId}
        AND timestamp >= ${startTime}::timestamptz
        AND timestamp <= ${endTime}::timestamptz
        AND environment = ${environment}
      GROUP BY 1
      ORDER BY 1
    `
    : await client`
      SELECT
        date_trunc(${granularity}, timestamp) as "timeBucket",
        COUNT(*)::int as count,
        COALESCE(SUM(cost_usd), 0)::float as "totalCost",
        COALESCE(AVG(latency_ms), 0)::float as "avgLatency",
        COALESCE(SUM(tokens), 0)::int as "totalTokens"
      FROM traces
      WHERE customer_id = ${customerId}
        AND timestamp >= ${startTime}::timestamptz
        AND timestamp <= ${endTime}::timestamptz
      GROUP BY 1
      ORDER BY 1
    `;

  return result.map((row) => ({
    timeBucket: row.timeBucket,
    count: row.count,
    totalCost: row.totalCost,
    avgLatency: row.avgLatency,
    totalTokens: row.totalTokens,
  }));
}

/**
 * Breakdown data by dimension
 */
export interface BreakdownDataPoint {
  dimension: string;
  count: number;
  totalCost: number;
  avgLatency: number;
  totalTokens: number;
}

/**
 * Get cost breakdown by service, model, or endpoint
 *
 * @example
 * ```typescript
 * const breakdown = await getCostBreakdown(db, {
 *   customerId: 'customer-123',
 *   groupBy: 'service_name',
 *   startTime: new Date('2024-01-01'),
 *   endTime: new Date('2024-12-31'),
 * });
 * ```
 */
export async function getCostBreakdown(
  db: Database,
  options: {
    customerId: string;
    groupBy: 'service_name' | 'model' | 'endpoint' | 'provider';
    startTime?: Date;
    endTime?: Date;
    environment?: 'live' | 'test';
    limit?: number;
  }
): Promise<BreakdownDataPoint[]> {
  const conditions = [eq(traces.customerId, options.customerId)];

  if (options.startTime) {
    conditions.push(gte(traces.timestamp, options.startTime));
  }

  if (options.endTime) {
    conditions.push(lte(traces.timestamp, options.endTime));
  }

  if (options.environment) {
    conditions.push(eq(traces.environment, options.environment));
  }

  let groupByColumn;
  switch (options.groupBy) {
    case 'service_name':
      groupByColumn = traces.serviceName;
      break;
    case 'model':
      groupByColumn = traces.model;
      break;
    case 'endpoint':
      groupByColumn = traces.endpoint;
      break;
    case 'provider':
      groupByColumn = traces.provider;
      break;
  }

  const result = await db
    .select({
      dimension: groupByColumn,
      count: sql<number>`COUNT(*)::int`,
      totalCost: sql<number>`COALESCE(SUM(${traces.costUsd}), 0)::float`,
      avgLatency: sql<number>`COALESCE(AVG(${traces.latencyMs}), 0)::float`,
      totalTokens: sql<number>`COALESCE(SUM(${traces.tokens}), 0)::int`,
    })
    .from(traces)
    .where(and(...conditions))
    .groupBy(groupByColumn)
    .orderBy(desc(sql`COALESCE(SUM(${traces.costUsd}), 0)`))
    .limit(options.limit || 50);

  return result.map((row) => ({
    dimension: row.dimension as string,
    count: row.count,
    totalCost: row.totalCost,
    avgLatency: row.avgLatency,
    totalTokens: row.totalTokens,
  }));
}

/**
 * Percentile result
 */
export interface PercentileResult {
  p50Cost: number;
  p95Cost: number;
  p99Cost: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
}

/**
 * Get percentiles for cost and latency
 *
 * @example
 * ```typescript
 * const percentiles = await getPercentiles(db, {
 *   customerId: 'customer-123',
 *   serviceName: 'my-service',
 *   endpoint: '/api/endpoint',
 * });
 * ```
 */
export async function getPercentiles(
  db: Database,
  options: {
    customerId: string;
    serviceName?: string;
    endpoint?: string;
    startTime?: Date;
    endTime?: Date;
  }
): Promise<PercentileResult> {
  const conditions = [eq(traces.customerId, options.customerId)];

  if (options.serviceName) {
    conditions.push(eq(traces.serviceName, options.serviceName));
  }

  if (options.endpoint) {
    conditions.push(eq(traces.endpoint, options.endpoint));
  }

  if (options.startTime) {
    conditions.push(gte(traces.timestamp, options.startTime));
  }

  if (options.endTime) {
    conditions.push(lte(traces.timestamp, options.endTime));
  }

  const result = await db
    .select({
      p50Cost: sql<number>`PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${traces.costUsd})::float`,
      p95Cost: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${traces.costUsd})::float`,
      p99Cost: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${traces.costUsd})::float`,
      p50Latency: sql<number>`PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${traces.latencyMs})::float`,
      p95Latency: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${traces.latencyMs})::float`,
      p99Latency: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ${traces.latencyMs})::float`,
    })
    .from(traces)
    .where(and(...conditions));

  return (
    result[0] || {
      p50Cost: 0,
      p95Cost: 0,
      p99Cost: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
    }
  );
}

/**
 * Endpoint trend data
 */
export interface EndpointTrend {
  endpoint: string;
  serviceName: string;
  model: string;
  totalRequests: number;
  totalCost: number;
  avgCost: number;
  avgLatency: number;
  errorRate: number;
}

/**
 * Get endpoint trends with aggregations
 *
 * @example
 * ```typescript
 * const trends = await getEndpointTrends(client, {
 *   customerId: 'customer-123',
 *   startTime: new Date('2024-01-01'),
 *   endTime: new Date('2024-12-31'),
 * });
 * ```
 */
export async function getEndpointTrends(
  client: postgres.Sql,
  options: {
    customerId: string;
    serviceName?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }
): Promise<EndpointTrend[]> {
  // Use raw postgres client with template literals for full control
  // This avoids Drizzle's SQL generation issues with GROUP BY
  const { customerId, serviceName, startTime, endTime, limit = 20 } = options;

  // Build dynamic WHERE conditions
  const conditions: string[] = ['customer_id = $1'];
  const params: any[] = [customerId];

  if (serviceName) {
    params.push(serviceName);
    conditions.push(`service_name = $${params.length}`);
  }

  if (startTime) {
    params.push(startTime.toISOString());
    conditions.push(`timestamp >= $${params.length}::timestamptz`);
  }

  if (endTime) {
    params.push(endTime.toISOString());
    conditions.push(`timestamp <= $${params.length}::timestamptz`);
  }

  params.push(limit);
  const limitParam = `$${params.length}`;

  const whereClause = conditions.join(' AND ');

  const result = await client.unsafe(
    `
    SELECT
      endpoint,
      service_name as "serviceName",
      model,
      COUNT(*)::int as "totalRequests",
      COALESCE(SUM(cost_usd), 0)::float as "totalCost",
      COALESCE(AVG(cost_usd), 0)::float as "avgCost",
      COALESCE(AVG(latency_ms), 0)::float as "avgLatency",
      COUNT(*) FILTER (WHERE status = 'error')::int as "errorCount"
    FROM traces
    WHERE ${whereClause}
    GROUP BY endpoint, service_name, model
    ORDER BY COUNT(*) DESC
    LIMIT ${limitParam}
  `,
    params
  );

  return result.map((row) => ({
    endpoint: row.endpoint,
    serviceName: row.serviceName,
    model: row.model,
    totalRequests: row.totalRequests,
    totalCost: row.totalCost,
    avgCost: row.avgCost,
    avgLatency: row.avgLatency,
    errorRate: row.totalRequests > 0 ? (row.errorCount / row.totalRequests) * 100 : 0,
  }));
}

/**
 * Get summary statistics for a customer
 *
 * @example
 * ```typescript
 * const summary = await getAnalyticsSummary(db, {
 *   customerId: 'customer-123',
 *   startTime: new Date('2024-01-01'),
 *   endTime: new Date('2024-12-31'),
 * });
 * ```
 */
export async function getAnalyticsSummary(
  db: Database,
  options: {
    customerId: string;
    startTime?: Date;
    endTime?: Date;
    environment?: 'live' | 'test';
  }
): Promise<{
  totalRequests: number;
  totalCost: number;
  avgCost: number;
  totalTokens: number;
  avgLatency: number;
  errorRate: number;
  uniqueServices: number;
  uniqueModels: number;
}> {
  const conditions = [eq(traces.customerId, options.customerId)];

  if (options.startTime) {
    conditions.push(gte(traces.timestamp, options.startTime));
  }

  if (options.endTime) {
    conditions.push(lte(traces.timestamp, options.endTime));
  }

  if (options.environment) {
    conditions.push(eq(traces.environment, options.environment));
  }

  const result = await db
    .select({
      totalRequests: sql<number>`COUNT(*)::int`,
      totalCost: sql<number>`COALESCE(SUM(${traces.costUsd}), 0)::float`,
      avgCost: sql<number>`COALESCE(AVG(${traces.costUsd}), 0)::float`,
      totalTokens: sql<number>`COALESCE(SUM(${traces.tokens}), 0)::int`,
      avgLatency: sql<number>`COALESCE(AVG(${traces.latencyMs}), 0)::float`,
      errorCount: sql<number>`COUNT(*) FILTER (WHERE ${traces.status} = 'error')::int`,
      uniqueServices: sql<number>`COUNT(DISTINCT ${traces.serviceName})::int`,
      uniqueModels: sql<number>`COUNT(DISTINCT ${traces.model})::int`,
    })
    .from(traces)
    .where(and(...conditions));

  const row = result[0];
  if (!row) {
    return {
      totalRequests: 0,
      totalCost: 0,
      avgCost: 0,
      totalTokens: 0,
      avgLatency: 0,
      errorRate: 0,
      uniqueServices: 0,
      uniqueModels: 0,
    };
  }

  return {
    totalRequests: row.totalRequests,
    totalCost: row.totalCost,
    avgCost: row.avgCost,
    totalTokens: row.totalTokens,
    avgLatency: row.avgLatency,
    errorRate: row.totalRequests > 0 ? (row.errorCount / row.totalRequests) * 100 : 0,
    uniqueServices: row.uniqueServices,
    uniqueModels: row.uniqueModels,
  };
}
