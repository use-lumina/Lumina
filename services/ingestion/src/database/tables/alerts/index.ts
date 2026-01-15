import postgres from 'postgres';
import type { Alert } from '@lumina/core';
import { file } from 'bun';

// Load SQL queries using Bun's file API
const sqlDir = import.meta.dir + '/sql';
const insertSQL = await file(`${sqlDir}/insert.sql`).text();
const querySQL = await file(`${sqlDir}/query.sql`).text();
const updateStatusSQL = await file(`${sqlDir}/update-status.sql`).text();

export interface AlertRecord {
  alert_id: string;
  trace_id: string;
  span_id: string;
  customer_id: string;
  alert_type: 'cost_spike' | 'quality_drop' | 'latency_spike' | 'cost_and_quality';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  current_cost?: number;
  baseline_cost?: number;
  cost_increase_percent?: number;
  hash_similarity?: number;
  semantic_score?: number;
  scoring_method?: 'hash_only' | 'semantic' | 'both';
  semantic_cached?: boolean;
  service_name: string;
  endpoint: string;
  model?: string;
  reasoning?: string;
  timestamp: Date;
  status: 'pending' | 'sent' | 'acknowledged' | 'resolved';
  acknowledged_at?: Date;
  resolved_at?: Date;
  created_at: Date;
}

export interface QueryAlertsParams {
  customerId: string;
  status?: 'pending' | 'sent' | 'acknowledged' | 'resolved';
  alertType?: 'cost_spike' | 'quality_drop' | 'latency_spike' | 'cost_and_quality';
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  serviceName?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Alerts Table
 * Handles all alert-related database operations
 */
export class AlertsTable {
  constructor(private sql: postgres.Sql) {}

  /**
   * Insert a single alert
   */
  async insertAlert(alert: Alert, customerId: string, spanId: string): Promise<void> {
    await this.sql.unsafe(insertSQL, [
      alert.alertId,
      alert.traceId,
      spanId,
      customerId,
      alert.alertType,
      alert.severity,
      alert.details.currentCost ?? null,
      alert.details.baselineCost ?? null,
      alert.details.costIncreasePercent ?? null,
      alert.details.hashSimilarity ?? null,
      alert.details.semanticScore ?? null,
      alert.details.scoringMethod ?? null,
      alert.details.cached ?? false,
      alert.details.serviceName,
      alert.details.endpoint,
      alert.details.model ?? null,
      alert.details.reasoning ?? null,
      alert.timestamp,
    ]);
  }

  /**
   * Insert multiple alerts in a batch
   */
  async insertBatch(
    alerts: Array<{ alert: Alert; customerId: string; spanId: string }>
  ): Promise<void> {
    if (alerts.length === 0) return;

    await this.sql`
      INSERT INTO alerts ${this.sql(
        alerts.map(({ alert, customerId, spanId }) => ({
          alert_id: alert.alertId,
          trace_id: alert.traceId,
          span_id: spanId,
          customer_id: customerId,
          alert_type: alert.alertType,
          severity: alert.severity,
          current_cost: alert.details.currentCost ?? null,
          baseline_cost: alert.details.baselineCost ?? null,
          cost_increase_percent: alert.details.costIncreasePercent ?? null,
          hash_similarity: alert.details.hashSimilarity ?? null,
          semantic_score: alert.details.semanticScore ?? null,
          scoring_method: alert.details.scoringMethod ?? null,
          semantic_cached: alert.details.cached ?? false,
          service_name: alert.details.serviceName,
          endpoint: alert.details.endpoint,
          model: alert.details.model ?? null,
          reasoning: alert.details.reasoning ?? null,
          timestamp: alert.timestamp,
          status: 'pending',
        }))
      )}
    `;
  }

  /**
   * Query alerts with filters
   */
  async query(params: QueryAlertsParams): Promise<AlertRecord[]> {
    const {
      customerId,
      status,
      alertType,
      severity,
      serviceName,
      startTime,
      endTime,
      limit = 100,
      offset = 0,
    } = params;

    const alerts = await this.sql.unsafe<AlertRecord[]>(querySQL, [
      customerId,
      status || null,
      alertType || null,
      severity || null,
      serviceName || null,
      startTime || null,
      endTime || null,
      limit,
      offset,
    ]);

    return alerts;
  }

  /**
   * Update alert status
   */
  async updateStatus(alertId: string, status: 'sent' | 'acknowledged' | 'resolved'): Promise<void> {
    const now = new Date();

    await this.sql.unsafe(updateStatusSQL, [
      alertId,
      status,
      status === 'acknowledged' ? now : null,
      status === 'resolved' ? now : null,
    ]);
  }

  /**
   * Get alert by ID
   */
  async getById(alertId: string): Promise<AlertRecord | null> {
    const [alert] = await this.sql<AlertRecord[]>`
      SELECT *
      FROM alerts
      WHERE alert_id = ${alertId}
    `;

    return alert || null;
  }

  /**
   * Get alert statistics for a customer
   */
  async getStats(
    customerId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    totalAlerts: number;
    pending: number;
    sent: number;
    acknowledged: number;
    resolved: number;
  }> {
    let query = this.sql`
      SELECT
        COUNT(*)::int as total_alerts,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
        COUNT(*) FILTER (WHERE status = 'acknowledged')::int as acknowledged,
        COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved
      FROM alerts
      WHERE customer_id = ${customerId}
    `;

    if (startTime) {
      query = this.sql`${query} AND timestamp >= ${startTime}`;
    }

    if (endTime) {
      query = this.sql`${query} AND timestamp <= ${endTime}`;
    }

    const [stats] = await query;

    return {
      totalAlerts: stats?.total_alerts || 0,
      pending: stats?.pending || 0,
      sent: stats?.sent || 0,
      acknowledged: stats?.acknowledged || 0,
      resolved: stats?.resolved || 0,
    };
  }
}
