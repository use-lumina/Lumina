import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { Database } from '../db';
import { alerts, traces, type Alert, type NewAlert } from '../schema';

/**
 * Alert query options for filtering
 */
export interface AlertQueryOptions {
  customerId: string;
  status?: 'pending' | 'sent' | 'acknowledged' | 'resolved';
  alertType?: 'cost_spike' | 'quality_drop' | 'latency_spike' | 'cost_and_quality';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Build a dynamic alert query with filters
 *
 * @example
 * ```typescript
 * const results = await getAlertsWithFilters(db, {
 *   customerId: 'customer-123',
 *   status: 'pending',
 *   severity: 'HIGH',
 * });
 * ```
 */
export async function getAlertsWithFilters(
  db: Database,
  options: AlertQueryOptions
): Promise<Alert[]> {
  const conditions = [eq(alerts.customerId, options.customerId)];

  if (options.status) {
    conditions.push(eq(alerts.status, options.status));
  }

  if (options.alertType) {
    conditions.push(eq(alerts.alertType, options.alertType));
  }

  if (options.severity) {
    conditions.push(eq(alerts.severity, options.severity));
  }

  if (options.startTime) {
    conditions.push(gte(alerts.timestamp, options.startTime));
  }

  if (options.endTime) {
    conditions.push(lte(alerts.timestamp, options.endTime));
  }

  return await db
    .select()
    .from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.timestamp))
    .limit(options.limit || 100)
    .offset(options.offset || 0);
}

/**
 * Alert with trace data (from join)
 */
export interface AlertWithTrace extends Alert {
  trace?: {
    prompt: string | null;
    response: string | null;
    tokens: number;
    latencyMs: number;
    costUsd: number | null;
  } | null;
}

/**
 * Get a single alert with joined trace data
 *
 * @example
 * ```typescript
 * const alert = await getAlertWithTrace(db, 'alert-uuid');
 * ```
 */
export async function getAlertWithTrace(
  db: Database,
  alertId: string
): Promise<AlertWithTrace | undefined> {
  const result = await db
    .select({
      // Alert fields
      alertId: alerts.alertId,
      traceId: alerts.traceId,
      spanId: alerts.spanId,
      customerId: alerts.customerId,
      alertType: alerts.alertType,
      severity: alerts.severity,
      currentCost: alerts.currentCost,
      baselineCost: alerts.baselineCost,
      costIncreasePercent: alerts.costIncreasePercent,
      hashSimilarity: alerts.hashSimilarity,
      semanticScore: alerts.semanticScore,
      scoringMethod: alerts.scoringMethod,
      semanticCached: alerts.semanticCached,
      serviceName: alerts.serviceName,
      endpoint: alerts.endpoint,
      model: alerts.model,
      reasoning: alerts.reasoning,
      timestamp: alerts.timestamp,
      createdAt: alerts.createdAt,
      status: alerts.status,
      acknowledgedAt: alerts.acknowledgedAt,
      resolvedAt: alerts.resolvedAt,
      // Trace fields (nested)
      trace_prompt: traces.prompt,
      trace_response: traces.response,
      trace_tokens: traces.tokens,
      trace_latencyMs: traces.latencyMs,
      trace_costUsd: traces.costUsd,
    })
    .from(alerts)
    .leftJoin(traces, and(eq(alerts.traceId, traces.traceId), eq(alerts.spanId, traces.spanId)))
    .where(eq(alerts.alertId, alertId))
    .limit(1);

  const row = result[0];
  if (!row) return undefined;

  return {
    alertId: row.alertId,
    traceId: row.traceId,
    spanId: row.spanId,
    customerId: row.customerId,
    alertType: row.alertType,
    severity: row.severity,
    currentCost: row.currentCost,
    baselineCost: row.baselineCost,
    costIncreasePercent: row.costIncreasePercent,
    hashSimilarity: row.hashSimilarity,
    semanticScore: row.semanticScore,
    scoringMethod: row.scoringMethod,
    semanticCached: row.semanticCached,
    serviceName: row.serviceName,
    endpoint: row.endpoint,
    model: row.model,
    reasoning: row.reasoning,
    timestamp: row.timestamp,
    createdAt: row.createdAt,
    status: row.status,
    acknowledgedAt: row.acknowledgedAt,
    resolvedAt: row.resolvedAt,
    trace: row.trace_prompt
      ? {
          prompt: row.trace_prompt,
          response: row.trace_response,
          tokens: row.trace_tokens!,
          latencyMs: row.trace_latencyMs!,
          costUsd: row.trace_costUsd,
        }
      : null,
  };
}

/**
 * Insert a new alert
 *
 * @example
 * ```typescript
 * await insertAlert(db, {
 *   traceId: 'trace-123',
 *   spanId: 'span-456',
 *   customerId: 'customer-789',
 *   alertType: 'cost_spike',
 *   severity: 'HIGH',
 *   // ... other fields
 * });
 * ```
 */
export async function insertAlert(db: Database, alert: NewAlert): Promise<string> {
  const result = await db.insert(alerts).values(alert).returning({ alertId: alerts.alertId });
  if (!result[0]) throw new Error('Failed to insert alert');
  return result[0].alertId;
}

/**
 * Helper function to insert alerts from @lumina/core Alert type
 * This is for compatibility with the alert processing system
 *
 * @example
 * ```typescript
 * await insertAlertsFromCore(db, alerts.map(alert => ({ alert, customerId, spanId })));
 * ```
 */
export async function insertAlertsFromCore(
  db: Database,
  alertsData: Array<{ alert: any; customerId: string; spanId: string }>
): Promise<void> {
  if (alertsData.length === 0) return;

  const alertRecords: NewAlert[] = alertsData.map(({ alert, customerId, spanId }) => ({
    traceId: alert.traceId,
    spanId,
    customerId,
    alertType: alert.alertType,
    severity: alert.severity,
    currentCost: alert.details.currentCost ?? null,
    baselineCost: alert.details.baselineCost ?? null,
    costIncreasePercent: alert.details.costIncreasePercent ?? null,
    hashSimilarity: alert.details.hashSimilarity ?? null,
    semanticScore: alert.details.semanticScore ?? null,
    scoringMethod: alert.details.scoringMethod ?? null,
    semanticCached: alert.details.cached ?? false,
    serviceName: alert.details.serviceName,
    endpoint: alert.details.endpoint,
    model: alert.details.model ?? null,
    reasoning: alert.details.reasoning ?? null,
    timestamp: alert.timestamp,
    status: 'pending',
  }));

  await db.insert(alerts).values(alertRecords);
}

/**
 * Update alert status
 *
 * @example
 * ```typescript
 * await updateAlertStatus(db, 'alert-uuid', 'acknowledged');
 * ```
 */
export async function updateAlertStatus(
  db: Database,
  alertId: string,
  status: 'pending' | 'sent' | 'acknowledged' | 'resolved'
): Promise<void> {
  const updates: Partial<Alert> = { status };

  if (status === 'acknowledged') {
    updates.acknowledgedAt = new Date();
  }

  if (status === 'resolved') {
    updates.resolvedAt = new Date();
  }

  await db.update(alerts).set(updates).where(eq(alerts.alertId, alertId));
}

/**
 * Get alert counts by type and severity
 *
 * @example
 * ```typescript
 * const counts = await getAlertCounts(db, 'customer-123');
 * ```
 */
export async function getAlertCounts(
  db: Database,
  customerId: string
): Promise<Array<{ alertType: string; severity: string; count: number }>> {
  const result = await db
    .select({
      alertType: alerts.alertType,
      severity: alerts.severity,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(alerts)
    .where(and(eq(alerts.customerId, customerId), eq(alerts.status, 'pending')))
    .groupBy(alerts.alertType, alerts.severity);

  return result;
}

/**
 * Get alerts for a specific trace
 *
 * @example
 * ```typescript
 * const traceAlerts = await getAlertsForTrace(db, 'trace-123', 'span-456');
 * ```
 */
export async function getAlertsForTrace(
  db: Database,
  traceId: string,
  spanId: string
): Promise<Alert[]> {
  return await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.traceId, traceId), eq(alerts.spanId, spanId)))
    .orderBy(desc(alerts.timestamp));
}

/**
 * Get alert by ID
 *
 * @example
 * ```typescript
 * const alert = await getAlertById(db, 'alert-uuid');
 * ```
 */
export async function getAlertById(db: Database, alertId: string): Promise<Alert | undefined> {
  const result = await db.select().from(alerts).where(eq(alerts.alertId, alertId));
  return result[0];
}

/**
 * Insert multiple alerts in batch
 *
 * @example
 * ```typescript
 * const alertIds = await insertAlertsBatch(db, [alert1, alert2, alert3]);
 * ```
 */
export async function insertAlertsBatch(db: Database, alertsBatch: NewAlert[]): Promise<string[]> {
  if (alertsBatch.length === 0) {
    return [];
  }

  const result = await db.insert(alerts).values(alertsBatch).returning({ alertId: alerts.alertId });
  return result.map((r) => r.alertId);
}

/**
 * Delete alerts older than the cutoff date
 *
 * @example
 * ```typescript
 * const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
 * const deletedCount = await deleteOldAlerts(db, cutoff);
 * ```
 */
export async function deleteOldAlerts(db: Database, cutoffDate: Date): Promise<number> {
  const result = await db
    .delete(alerts)
    .where(lte(alerts.timestamp, cutoffDate))
    .returning({ id: alerts.alertId });
  return result.length;
}
