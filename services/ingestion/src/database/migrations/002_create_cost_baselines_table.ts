import type { Migration } from '../types';

export const createCostBaselinesTable: Migration = {
  name: 'create_cost_baselines_table',
  version: 2,

  async up(sql) {
    // Create cost_baselines table for anomaly detection
    await sql`
      CREATE TABLE IF NOT EXISTS cost_baselines (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        window_size VARCHAR(10) NOT NULL CHECK (window_size IN ('1h', '24h', '7d')),
        p50_cost DOUBLE PRECISION NOT NULL,
        p95_cost DOUBLE PRECISION NOT NULL,
        p99_cost DOUBLE PRECISION NOT NULL,
        sample_count INTEGER NOT NULL,
        last_updated TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(service_name, endpoint, window_size)
      )
    `;

    // Create indexes for baseline queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_baseline_service_endpoint
      ON cost_baselines(service_name, endpoint)
    `;
  },

  async down(sql) {
    await sql`DROP TABLE IF EXISTS cost_baselines CASCADE`;
  },
};
