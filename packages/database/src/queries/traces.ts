import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import type { Database } from '../db';
import { traces, type Trace, type NewTrace } from '../schema';

/**
 * Trace query options for filtering
 */
export interface TraceQueryOptions {
  customerId: string;
  environment?: 'live' | 'test';
  startTime?: Date;
  endTime?: Date;
  status?: 'success' | 'error';
  serviceName?: string;
  limit?: number;
  offset?: number;
}

/**
 * Build a dynamic trace query with filters
 *
 * @example
 * ```typescript
 * const results = await buildTraceQuery(db, {
 *   customerId: 'customer-123',
 *   environment: 'live',
 *   startTime: new Date('2024-01-01'),
 *   limit: 100,
 * });
 * ```
 */
export async function buildTraceQuery(db: Database, options: TraceQueryOptions): Promise<Trace[]> {
  const conditions = [eq(traces.customerId, options.customerId)];

  if (options.environment) {
    conditions.push(eq(traces.environment, options.environment));
  }

  if (options.startTime) {
    conditions.push(gte(traces.timestamp, options.startTime));
  }

  if (options.endTime) {
    conditions.push(lte(traces.timestamp, options.endTime));
  }

  if (options.status) {
    conditions.push(eq(traces.status, options.status));
  }

  if (options.serviceName) {
    conditions.push(eq(traces.serviceName, options.serviceName));
  }

  const query = db
    .select()
    .from(traces)
    .where(and(...conditions))
    .orderBy(desc(traces.timestamp))
    .limit(options.limit || 100)
    .offset(options.offset || 0);

  return await query;
}

/**
 * Insert a single trace
 *
 * @example
 * ```typescript
 * await insertTrace(db, {
 *   traceId: 'trace-123',
 *   spanId: 'span-456',
 *   customerId: 'customer-789',
 *   // ... other fields
 * });
 * ```
 */
export async function insertTrace(db: Database, trace: NewTrace): Promise<void> {
  await db.insert(traces).values(trace);
}

/**
 * Insert multiple traces in a batch with ON CONFLICT handling
 *
 * @example
 * ```typescript
 * await insertTracesBatch(db, [
 *   { traceId: 'trace-1', spanId: 'span-1', ... },
 *   { traceId: 'trace-2', spanId: 'span-2', ... },
 * ]);
 * ```
 */
export async function insertTracesBatch(db: Database, tracesBatch: NewTrace[]): Promise<void> {
  if (tracesBatch.length === 0) return;

  await db
    .insert(traces)
    .values(tracesBatch)
    .onConflictDoUpdate({
      target: [traces.traceId, traces.spanId],
      set: {
        timestamp: sql`EXCLUDED.timestamp`,
        latencyMs: sql`EXCLUDED.latency_ms`,
        status: sql`EXCLUDED.status`,
      },
    });
}

/**
 * Get a single trace by ID
 *
 * @example
 * ```typescript
 * const trace = await getTraceById(db, 'trace-123', 'span-456');
 * ```
 */
export async function getTraceById(
  db: Database,
  traceId: string,
  spanId: string
): Promise<Trace | undefined> {
  const result = await db
    .select()
    .from(traces)
    .where(and(eq(traces.traceId, traceId), eq(traces.spanId, spanId)))
    .limit(1);

  return result[0];
}

/**
 * Get traces by IDs (for batch operations)
 *
 * @example
 * ```typescript
 * const traces = await getTracesByIds(db, ['trace-1', 'trace-2'], ['span-1', 'span-2']);
 * ```
 */
export async function getTracesByIds(db: Database, traceIds: string[]): Promise<Trace[]> {
  if (traceIds.length === 0) return [];

  return await db.select().from(traces).where(inArray(traces.traceId, traceIds));
}

/**
 * Metrics aggregation result
 */
export interface TraceMetrics {
  totalTraces: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
}

/**
 * Get aggregated metrics for traces
 *
 * @example
 * ```typescript
 * const metrics = await getTraceMetrics(db, {
 *   customerId: 'customer-123',
 *   startTime: new Date('2024-01-01'),
 *   endTime: new Date('2024-12-31'),
 * });
 * ```
 */
export async function getTraceMetrics(
  db: Database,
  options: {
    customerId: string;
    environment?: 'live' | 'test';
    startTime?: Date;
    endTime?: Date;
  }
): Promise<TraceMetrics> {
  const conditions = [eq(traces.customerId, options.customerId)];

  if (options.environment) {
    conditions.push(eq(traces.environment, options.environment));
  }

  if (options.startTime) {
    conditions.push(gte(traces.timestamp, options.startTime));
  }

  if (options.endTime) {
    conditions.push(lte(traces.timestamp, options.endTime));
  }

  const result = await db
    .select({
      totalTraces: sql<number>`COUNT(*)::int`,
      totalTokens: sql<number>`COALESCE(SUM(${traces.tokens}), 0)::int`,
      totalCost: sql<number>`COALESCE(SUM(${traces.costUsd}), 0)::float`,
      avgLatency: sql<number>`COALESCE(AVG(${traces.latencyMs}), 0)::float`,
      successCount: sql<number>`COUNT(*) FILTER (WHERE ${traces.status} = 'success')::int`,
    })
    .from(traces)
    .where(and(...conditions));

  const row = result[0];
  if (!row) {
    return {
      totalTraces: 0,
      totalTokens: 0,
      totalCost: 0,
      avgLatency: 0,
      successRate: 0,
    };
  }

  const successRate = row.totalTraces > 0 ? (row.successCount / row.totalTraces) * 100 : 0;

  return {
    totalTraces: row.totalTraces,
    totalTokens: row.totalTokens,
    totalCost: row.totalCost,
    avgLatency: row.avgLatency,
    successRate,
  };
}

/**
 * Cost sample for baseline calculation
 */
export interface CostSample {
  costUsd: number;
  timestamp: Date;
}

/**
 * Get cost samples for baseline calculation
 *
 * @example
 * ```typescript
 * const samples = await getCostSamples(db, 'my-service', '/api/endpoint', '24h');
 * ```
 */
export async function getCostSamples(
  db: Database,
  serviceName: string,
  endpoint: string,
  window: '1h' | '24h' | '7d'
): Promise<CostSample[]> {
  // Calculate time cutoff based on window
  const now = new Date();
  let cutoffTime = new Date();

  switch (window) {
    case '1h':
      cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }

  const results = await db
    .select({
      costUsd: traces.costUsd,
      timestamp: traces.timestamp,
    })
    .from(traces)
    .where(
      and(
        eq(traces.serviceName, serviceName),
        eq(traces.endpoint, endpoint),
        gte(traces.timestamp, cutoffTime)
      )
    );

  return results.map((row) => ({
    costUsd: row.costUsd || 0,
    timestamp: row.timestamp,
  }));
}

/**
 * Update semantic scoring for a trace
 *
 * @example
 * ```typescript
 * await updateTraceSemanticScore(db, 'trace-123', 'span-456', {
 *   semanticScore: 0.95,
 *   hashSimilarity: 0.88,
 *   semanticCached: true,
 * });
 * ```
 */
export async function updateTraceSemanticScore(
  db: Database,
  traceId: string,
  spanId: string,
  scores: {
    semanticScore?: number;
    hashSimilarity?: number;
    semanticCached?: boolean;
  }
): Promise<void> {
  await db
    .update(traces)
    .set({
      ...scores,
      semanticScoredAt: new Date(),
    })
    .where(and(eq(traces.traceId, traceId), eq(traces.spanId, spanId)));
}

/**
 * Delete traces older than a cutoff date (for retention cleanup)
 *
 * @example
 * ```typescript
 * const deletedCount = await deleteOldTraces(db, new Date('2024-01-01'));
 * ```
 */
export async function deleteOldTraces(db: Database, cutoffDate: Date): Promise<number> {
  const result = await db
    .delete(traces)
    .where(lte(traces.timestamp, cutoffDate))
    .returning({ traceId: traces.traceId });
  return result.length;
}

/**
 * Get trace counts for retention statistics
 *
 * @example
 * ```typescript
 * const stats = await getTraceRetentionStats(db, new Date('2024-01-01'));
 * ```
 */
export async function getTraceRetentionStats(
  db: Database,
  cutoffDate: Date
): Promise<{
  totalTraces: number;
  recentTraces: number;
  oldTraces: number;
  oldestTimestamp: Date | null;
}> {
  // Get total count
  const totalResult = await db.select({ count: sql<number>`COUNT(*)::int` }).from(traces);
  const totalTraces = totalResult[0]?.count || 0;

  // Get recent traces count (newer than cutoff)
  const recentResult = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(traces)
    .where(gte(traces.timestamp, cutoffDate));
  const recentTraces = recentResult[0]?.count || 0;

  // Calculate old traces
  const oldTraces = totalTraces - recentTraces;

  // Get oldest timestamp
  const oldestResult = await db
    .select({ oldest: sql<Date | null>`MIN(${traces.timestamp})` })
    .from(traces);
  const oldestTimestamp = oldestResult[0]?.oldest || null;

  return {
    totalTraces,
    recentTraces,
    oldTraces,
    oldestTimestamp,
  };
}
