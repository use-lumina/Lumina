import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import type { Database } from '../db';
import {
  replaySets,
  replayResults,
  traces,
  type ReplaySet,
  type NewReplaySet,
  type ReplayResult,
  type NewReplayResult,
} from '../schema';

/**
 * Replay Sets Queries
 */

/**
 * Create a new replay set
 *
 * @example
 * ```typescript
 * const replayId = await createReplaySet(db, {
 *   name: 'API Test Replay',
 *   description: 'Testing new model on production traces',
 *   traceIds: ['trace-1', 'trace-2', 'trace-3'],
 *   totalTraces: 3,
 *   createdBy: 'user@example.com',
 * });
 * ```
 */
export async function createReplaySet(db: Database, replaySet: NewReplaySet): Promise<string> {
  const result = await db
    .insert(replaySets)
    .values(replaySet)
    .returning({ replayId: replaySets.replayId });
  if (!result[0]) throw new Error('Failed to create replay set');
  return result[0].replayId;
}

/**
 * Get a replay set by ID
 *
 * @example
 * ```typescript
 * const replaySet = await getReplaySet(db, 'replay-uuid');
 * ```
 */
export async function getReplaySet(db: Database, replayId: string): Promise<ReplaySet | undefined> {
  const result = await db
    .select()
    .from(replaySets)
    .where(eq(replaySets.replayId, replayId))
    .limit(1);
  return result[0];
}

/**
 * Get all replay sets
 *
 * @example
 * ```typescript
 * const sets = await getAllReplaySets(db, { limit: 50 });
 * ```
 */
export async function getAllReplaySets(
  db: Database,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ReplaySet[]> {
  const conditions = [];
  if (options?.status) {
    conditions.push(eq(replaySets.status, options.status));
  }

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(replaySets)
          .where(and(...conditions))
      : db.select().from(replaySets);

  return await query
    .orderBy(desc(replaySets.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);
}

/**
 * Update replay set status
 *
 * @example
 * ```typescript
 * await updateReplaySetStatus(db, 'replay-uuid', 'running');
 * await updateReplaySetStatus(db, 'replay-uuid', 'completed');
 * await updateReplaySetStatus(db, 'replay-uuid', 'failed', 'Error message');
 * ```
 */
export async function updateReplaySetStatus(
  db: Database,
  replayId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const updates: any = { status };

  // Set timestamp fields based on status
  if (status === 'running') {
    updates.startedAt = new Date();
  } else if (status === 'completed' || status === 'failed') {
    updates.completedAt = new Date();
  }

  if (errorMessage) {
    updates.errorMessage = errorMessage;
  }

  await db.update(replaySets).set(updates).where(eq(replaySets.replayId, replayId));
}

/**
 * Increment completed traces count
 *
 * @example
 * ```typescript
 * await incrementCompletedTraces(db, 'replay-uuid');
 * ```
 */
export async function incrementCompletedTraces(db: Database, replayId: string): Promise<void> {
  await db
    .update(replaySets)
    .set({
      completedTraces: sql`${replaySets.completedTraces} + 1`,
    })
    .where(eq(replaySets.replayId, replayId));
}

/**
 * Delete a replay set (cascades to replay results)
 *
 * @example
 * ```typescript
 * await deleteReplaySet(db, 'replay-uuid');
 * ```
 */
export async function deleteReplaySet(db: Database, replayId: string): Promise<void> {
  await db.delete(replaySets).where(eq(replaySets.replayId, replayId));
}

/**
 * Replay Results Queries
 */

/**
 * Create a new replay result
 *
 * @example
 * ```typescript
 * const resultId = await createReplayResult(db, {
 *   replayId: 'replay-uuid',
 *   traceId: 'trace-123',
 *   spanId: 'span-456',
 *   originalResponse: 'Original response text',
 *   replayResponse: 'Replayed response text',
 *   originalCost: '0.001',
 *   replayCost: '0.0015',
 *   originalLatency: 500,
 *   replayLatency: 450,
 * });
 * ```
 */
export async function createReplayResult(db: Database, result: NewReplayResult): Promise<string> {
  const inserted = await db
    .insert(replayResults)
    .values(result)
    .returning({ resultId: replayResults.resultId });
  if (!inserted[0]) throw new Error('Failed to create replay result');
  return inserted[0].resultId;
}

/**
 * Get a replay result by ID
 *
 * @example
 * ```typescript
 * const result = await getReplayResult(db, 'result-uuid');
 * ```
 */
export async function getReplayResult(
  db: Database,
  resultId: string
): Promise<ReplayResult | undefined> {
  const result = await db
    .select()
    .from(replayResults)
    .where(eq(replayResults.resultId, resultId))
    .limit(1);
  return result[0];
}

/**
 * Get all results for a replay set
 *
 * @example
 * ```typescript
 * const results = await getReplayResults(db, 'replay-uuid');
 * ```
 */
export async function getReplayResults(db: Database, replayId: string): Promise<ReplayResult[]> {
  return await db
    .select()
    .from(replayResults)
    .where(eq(replayResults.replayId, replayId))
    .orderBy(desc(replayResults.executedAt));
}

/**
 * Replay result with original trace data
 */
export interface ReplayResultWithTrace extends ReplayResult {
  trace?: {
    serviceName: string;
    endpoint: string;
    model: string;
    environment: string;
    customerId: string;
  } | null;
}

/**
 * Get replay results with joined trace data
 *
 * @example
 * ```typescript
 * const results = await getReplayResultsWithTraces(db, 'replay-uuid');
 * ```
 */
export async function getReplayResultsWithTraces(
  db: Database,
  replayId: string
): Promise<ReplayResultWithTrace[]> {
  const results = await db
    .select({
      // Replay result fields
      resultId: replayResults.resultId,
      replayId: replayResults.replayId,
      traceId: replayResults.traceId,
      spanId: replayResults.spanId,
      originalResponse: replayResults.originalResponse,
      replayResponse: replayResults.replayResponse,
      originalCost: replayResults.originalCost,
      replayCost: replayResults.replayCost,
      originalLatency: replayResults.originalLatency,
      replayLatency: replayResults.replayLatency,
      hashSimilarity: replayResults.hashSimilarity,
      semanticScore: replayResults.semanticScore,
      diffSummary: replayResults.diffSummary,
      replayPrompt: replayResults.replayPrompt,
      replayModel: replayResults.replayModel,
      replaySystemPrompt: replayResults.replaySystemPrompt,
      executedAt: replayResults.executedAt,
      status: replayResults.status,
      // Trace fields (nested)
      trace_serviceName: traces.serviceName,
      trace_endpoint: traces.endpoint,
      trace_model: traces.model,
      trace_environment: traces.environment,
      trace_customerId: traces.customerId,
    })
    .from(replayResults)
    .leftJoin(
      traces,
      and(eq(replayResults.traceId, traces.traceId), eq(replayResults.spanId, traces.spanId))
    )
    .where(eq(replayResults.replayId, replayId))
    .orderBy(desc(replayResults.executedAt));

  return results.map((row) => ({
    resultId: row.resultId,
    replayId: row.replayId,
    traceId: row.traceId,
    spanId: row.spanId,
    originalResponse: row.originalResponse,
    replayResponse: row.replayResponse,
    originalCost: row.originalCost,
    replayCost: row.replayCost,
    originalLatency: row.originalLatency,
    replayLatency: row.replayLatency,
    hashSimilarity: row.hashSimilarity,
    semanticScore: row.semanticScore,
    diffSummary: row.diffSummary,
    replayPrompt: row.replayPrompt,
    replayModel: row.replayModel,
    replaySystemPrompt: row.replaySystemPrompt,
    executedAt: row.executedAt,
    status: row.status,
    trace: row.trace_serviceName
      ? {
          serviceName: row.trace_serviceName,
          endpoint: row.trace_endpoint!,
          model: row.trace_model!,
          environment: row.trace_environment!,
          customerId: row.trace_customerId!,
        }
      : null,
  }));
}

/**
 * Get replay statistics
 *
 * @example
 * ```typescript
 * const stats = await getReplayStats(db, 'replay-uuid');
 * ```
 */
export async function getReplayStats(
  db: Database,
  replayId: string
): Promise<{
  totalResults: number;
  avgCostDiff: number;
  avgLatencyDiff: number;
  avgHashSimilarity: number;
  avgSemanticScore: number;
}> {
  const result = await db
    .select({
      totalResults: sql<number>`COUNT(*)::int`,
      avgCostDiff: sql<number>`COALESCE(AVG(${replayResults.replayCost}::float - ${replayResults.originalCost}::float), 0)::float`,
      avgLatencyDiff: sql<number>`COALESCE(AVG(${replayResults.replayLatency} - ${replayResults.originalLatency}), 0)::float`,
      avgHashSimilarity: sql<number>`COALESCE(AVG(${replayResults.hashSimilarity}::float), 0)::float`,
      avgSemanticScore: sql<number>`COALESCE(AVG(${replayResults.semanticScore}::float), 0)::float`,
    })
    .from(replayResults)
    .where(eq(replayResults.replayId, replayId));

  return (
    result[0] || {
      totalResults: 0,
      avgCostDiff: 0,
      avgLatencyDiff: 0,
      avgHashSimilarity: 0,
      avgSemanticScore: 0,
    }
  );
}

/**
 * Get traces for replay (by trace IDs)
 *
 * @example
 * ```typescript
 * const traces = await getTracesForReplay(db, ['trace-1', 'trace-2', 'trace-3']);
 * ```
 */
export async function getTracesForReplay(db: Database, traceIds: string[]): Promise<any[]> {
  if (traceIds.length === 0) return [];

  return await db.select().from(traces).where(inArray(traces.traceId, traceIds));
}

/**
 * Delete all replay results for a replay set
 *
 * @example
 * ```typescript
 * const deletedCount = await deleteReplayResultsBySetId(db, 'replay-uuid');
 * ```
 */
export async function deleteReplayResultsBySetId(db: Database, replayId: string): Promise<number> {
  const result = await db
    .delete(replayResults)
    .where(eq(replayResults.replayId, replayId))
    .returning({ id: replayResults.resultId });
  return result.length;
}

// Aliases for backward compatibility with test files
export const getReplaySetById = getReplaySet;
export const getReplayResultsBySetId = getReplayResults;
export const getReplayResultById = getReplayResult;
