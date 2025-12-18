import postgres from 'postgres';
import type { Trace } from '@lumina/schema';
import { file } from 'bun';

// Load SQL queries using Bun's file API
const sqlDir = import.meta.dir + '/sql';
const insertSQL = await file(`${sqlDir}/insert.sql`).text();
const querySQL = await file(`${sqlDir}/query.sql`).text();
const getMetricsSQL = await file(`${sqlDir}/get-metrics.sql`).text();
const getCostSamplesSQL = await file(`${sqlDir}/get-cost-samples.sql`).text();

/**
 * Traces Table
 * Handles all trace-related database operations
 */
export class TracesTable {
  constructor(private sql: postgres.Sql) {}

  /**
   * Insert a single trace
   */
  async insertTrace(trace: Trace): Promise<void> {
    await this.sql.unsafe(insertSQL, [
      trace.trace_id,
      trace.span_id,
      trace.parent_span_id || null,
      trace.customer_id,
      trace.timestamp,
      trace.service_name,
      trace.endpoint,
      trace.environment,
      trace.model,
      trace.provider || null,
      trace.prompt,
      trace.response,
      trace.tokens,
      trace.prompt_tokens || null,
      trace.completion_tokens || null,
      trace.latency_ms,
      trace.cost_usd,
      trace.metadata ? JSON.stringify(trace.metadata) : null,
      trace.tags || null,
      trace.status,
      trace.error_message || null,
    ]);
  }

  /**
   * Insert multiple traces in a batch
   */
  async insertBatch(traces: Trace[]): Promise<void> {
    if (traces.length === 0) return;

    // Use postgres library's built-in batch insert
    await this.sql`
      INSERT INTO traces ${this.sql(
        traces.map((trace) => ({
          trace_id: trace.trace_id,
          span_id: trace.span_id,
          parent_span_id: trace.parent_span_id || null,
          customer_id: trace.customer_id,
          timestamp: trace.timestamp,
          service_name: trace.service_name,
          endpoint: trace.endpoint,
          environment: trace.environment,
          model: trace.model,
          provider: trace.provider || null,
          prompt: trace.prompt,
          response: trace.response,
          tokens: trace.tokens,
          prompt_tokens: trace.prompt_tokens || null,
          completion_tokens: trace.completion_tokens || null,
          latency_ms: trace.latency_ms,
          cost_usd: trace.cost_usd,
          metadata: trace.metadata ? JSON.stringify(trace.metadata) : null,
          tags: trace.tags || null,
          status: trace.status,
          error_message: trace.error_message || null,
        }))
      )}
      ON CONFLICT (trace_id, span_id) DO UPDATE SET
        timestamp = EXCLUDED.timestamp,
        latency_ms = EXCLUDED.latency_ms,
        status = EXCLUDED.status
    `;
  }

  /**
   * Query traces with filters
   */
  async queryTraces(options: {
    customerId: string;
    environment?: 'live' | 'test';
    startTime?: Date;
    endTime?: Date;
    status?: 'success' | 'error';
    serviceName?: string;
    limit?: number;
    offset?: number;
  }): Promise<Trace[]> {
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const rows = await this.sql.unsafe(querySQL, [
      options.customerId,
      options.environment || null,
      options.startTime || null,
      options.endTime || null,
      options.status || null,
      options.serviceName || null,
      limit,
      offset,
    ]);

    return rows.map((row) => this.rowToTrace(row));
  }

  /**
   * Get aggregated metrics for a customer
   */
  async getMetrics(options: {
    customerId: string;
    environment?: 'live' | 'test';
    startTime?: Date;
    endTime?: Date;
  }): Promise<{
    totalTraces: number;
    totalTokens: number;
    totalCost: number;
    avgLatency: number;
    successRate: number;
  }> {
    const result = await this.sql.unsafe(getMetricsSQL, [
      options.customerId,
      options.environment || null,
      options.startTime || null,
      options.endTime || null,
    ]);

    const row = result[0];

    return {
      totalTraces: Number(row.total_traces) || 0,
      totalTokens: Number(row.total_tokens) || 0,
      totalCost: Number(row.total_cost) || 0,
      avgLatency: Number(row.avg_latency) || 0,
      successRate: Number(row.success_rate) || 0,
    };
  }

  /**
   * Get cost samples for baseline calculation
   */
  async getCostSamples(
    serviceName: string,
    endpoint: string,
    window: '1h' | '24h' | '7d'
  ): Promise<Array<{ costUsd: number; timestamp: Date }>> {
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

    const rows = await this.sql.unsafe(getCostSamplesSQL, [serviceName, endpoint, cutoffTime]);

    return rows.map((row) => ({
      costUsd: Number(row.cost_usd),
      timestamp: new Date(row.timestamp),
    }));
  }

  /**
   * Convert database row to Trace object
   */
  private rowToTrace(row: Record<string, unknown>): Trace {
    return {
      trace_id: row.trace_id as string,
      span_id: row.span_id as string,
      parent_span_id: (row.parent_span_id as string | null) || undefined,
      customer_id: row.customer_id as string,
      timestamp: new Date(row.timestamp as string | Date),
      service_name: row.service_name as string,
      endpoint: row.endpoint as string,
      environment: row.environment as 'live' | 'test',
      model: row.model as string,
      provider: (row.provider as string | null) || undefined,
      prompt: row.prompt as string,
      response: row.response as string,
      tokens: Number(row.tokens),
      prompt_tokens: row.prompt_tokens ? Number(row.prompt_tokens) : undefined,
      completion_tokens: row.completion_tokens ? Number(row.completion_tokens) : undefined,
      latency_ms: Number(row.latency_ms),
      cost_usd: Number(row.cost_usd),
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : undefined,
      tags: (row.tags as string[] | null) || undefined,
      status: row.status as 'success' | 'error',
      error_message: (row.error_message as string | null) || undefined,
    };
  }
}
