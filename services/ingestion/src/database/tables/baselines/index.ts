import postgres from 'postgres';
import type { Baseline } from '@lumina/core';
import { file } from 'bun';

// Load SQL queries using Bun's file API
const sqlDir = import.meta.dir + '/sql';
const upsertSQL = await file(`${sqlDir}/upsert.sql`).text();
const getOneSQL = await file(`${sqlDir}/get-one.sql`).text();
const getAllSQL = await file(`${sqlDir}/get-all.sql`).text();

/**
 * Baselines Table
 * Handles all cost baseline-related database operations
 */
export class BaselinesTable {
  constructor(private sql: postgres.Sql) {}

  /**
   * Upsert a cost baseline
   */
  async upsertBaseline(baseline: Baseline): Promise<void> {
    await this.sql.unsafe(upsertSQL, [
      baseline.serviceName,
      baseline.endpoint,
      baseline.window,
      baseline.p50Cost,
      baseline.p95Cost,
      baseline.p99Cost,
      baseline.sampleCount,
      baseline.lastUpdated,
    ]);
  }

  /**
   * Get baseline for a specific service/endpoint/window
   */
  async getBaseline(
    serviceName: string,
    endpoint: string,
    window: '1h' | '24h' | '7d'
  ): Promise<Baseline | null> {
    const rows = await this.sql.unsafe(getOneSQL, [serviceName, endpoint, window]);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      serviceName: row.service_name,
      endpoint: row.endpoint,
      window: row.window_size as '1h' | '24h' | '7d',
      p50Cost: Number(row.p50_cost),
      p95Cost: Number(row.p95_cost),
      p99Cost: Number(row.p99_cost),
      sampleCount: Number(row.sample_count),
      lastUpdated: new Date(row.last_updated),
    };
  }

  /**
   * Get all baselines for a service/endpoint
   */
  async getBaselines(serviceName: string, endpoint: string): Promise<Baseline[]> {
    const rows = await this.sql.unsafe(getAllSQL, [serviceName, endpoint]);

    return rows.map((row) => ({
      serviceName: row.service_name,
      endpoint: row.endpoint,
      window: row.window_size as '1h' | '24h' | '7d',
      p50Cost: Number(row.p50_cost),
      p95Cost: Number(row.p95_cost),
      p99Cost: Number(row.p99_cost),
      sampleCount: Number(row.sample_count),
      lastUpdated: new Date(row.last_updated),
    }));
  }
}
