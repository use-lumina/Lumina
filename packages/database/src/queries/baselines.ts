import { eq, and, desc, sql } from 'drizzle-orm';
import type { Database } from '../db';
import { costBaselines, type CostBaseline, type NewCostBaseline } from '../schema';

/**
 * Get baseline for a service endpoint and window
 *
 * @example
 * ```typescript
 * const baseline = await getBaseline(db, 'my-service', '/api/endpoint', '24h');
 * ```
 */
export async function getBaseline(
  db: Database,
  serviceName: string,
  endpoint: string,
  windowSize: '1h' | '24h' | '7d'
): Promise<CostBaseline | undefined> {
  const result = await db
    .select()
    .from(costBaselines)
    .where(
      and(
        eq(costBaselines.serviceName, serviceName),
        eq(costBaselines.endpoint, endpoint),
        eq(costBaselines.windowSize, windowSize)
      )
    )
    .limit(1);

  return result[0];
}

/**
 * Upsert a baseline (insert or update if exists)
 *
 * @example
 * ```typescript
 * await upsertBaseline(db, {
 *   serviceName: 'my-service',
 *   endpoint: '/api/endpoint',
 *   windowSize: '24h',
 *   p50Cost: 0.01,
 *   p95Cost: 0.05,
 *   p99Cost: 0.10,
 *   sampleCount: 1000,
 * });
 * ```
 */
export async function upsertBaseline(db: Database, baseline: NewCostBaseline): Promise<void> {
  await db
    .insert(costBaselines)
    .values(baseline)
    .onConflictDoUpdate({
      target: [costBaselines.serviceName, costBaselines.endpoint, costBaselines.windowSize],
      set: {
        p50Cost: sql`EXCLUDED.p50_cost`,
        p95Cost: sql`EXCLUDED.p95_cost`,
        p99Cost: sql`EXCLUDED.p99_cost`,
        sampleCount: sql`EXCLUDED.sample_count`,
        lastUpdated: sql`NOW()`,
      },
    });
}

/**
 * Get all baselines for a service
 *
 * @example
 * ```typescript
 * const baselines = await getBaselinesForService(db, 'my-service');
 * ```
 */
export async function getBaselinesForService(
  db: Database,
  serviceName: string
): Promise<CostBaseline[]> {
  return await db.select().from(costBaselines).where(eq(costBaselines.serviceName, serviceName));
}

/**
 * Get all baselines for a service and endpoint
 *
 * @example
 * ```typescript
 * const baselines = await getBaselinesForEndpoint(db, 'my-service', '/api/endpoint');
 * ```
 */
export async function getBaselinesForEndpoint(
  db: Database,
  serviceName: string,
  endpoint: string
): Promise<CostBaseline[]> {
  return await db
    .select()
    .from(costBaselines)
    .where(and(eq(costBaselines.serviceName, serviceName), eq(costBaselines.endpoint, endpoint)));
}

/**
 * Delete a baseline
 *
 * @example
 * ```typescript
 * await deleteBaseline(db, 'my-service', '/api/endpoint', '24h');
 * ```
 */
export async function deleteBaseline(
  db: Database,
  serviceName: string,
  endpoint: string,
  windowSize: '1h' | '24h' | '7d'
): Promise<boolean> {
  const result = await db
    .delete(costBaselines)
    .where(
      and(
        eq(costBaselines.serviceName, serviceName),
        eq(costBaselines.endpoint, endpoint),
        eq(costBaselines.windowSize, windowSize)
      )
    )
    .returning({ id: costBaselines.serviceName });
  return result.length > 0;
}

/**
 * Get all baselines with optional filters
 *
 * @example
 * ```typescript
 * const allBaselines = await getAllBaselines(db);
 * const serviceBaselines = await getAllBaselines(db, { serviceName: 'my-service' });
 * ```
 */
export async function getAllBaselines(
  db: Database,
  filters?: {
    serviceName?: string;
    windowSize?: '1h' | '24h' | '7d';
  }
): Promise<CostBaseline[]> {
  const conditions = [];

  if (filters?.serviceName) {
    conditions.push(eq(costBaselines.serviceName, filters.serviceName));
  }

  if (filters?.windowSize) {
    conditions.push(eq(costBaselines.windowSize, filters.windowSize));
  }

  const query =
    conditions.length > 0
      ? db
          .select()
          .from(costBaselines)
          .where(and(...conditions))
      : db.select().from(costBaselines);

  return await query.orderBy(desc(costBaselines.lastUpdated));
}

/**
 * Calculate percentiles from cost samples
 * Helper function for baseline calculation
 *
 * @example
 * ```typescript
 * const percentiles = calculatePercentiles([0.01, 0.02, 0.03, 0.05, 0.10]);
 * // Returns: { p50: 0.03, p95: 0.10, p99: 0.10 }
 * ```
 */
export function calculatePercentiles(costs: number[]): {
  p50: number;
  p95: number;
  p99: number;
} {
  if (costs.length === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...costs].sort((a, b) => a - b);
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  };

  return {
    p50: getPercentile(50) || 0,
    p95: getPercentile(95) || 0,
    p99: getPercentile(99) || 0,
  };
}
