import type { Migration } from '../types';

export const addSemanticScoresAndAlerts: Migration = {
  name: 'add_semantic_scores_and_alerts',
  version: 3,

  async up(sql) {
    // Add semantic scoring columns to traces table
    await sql`
      ALTER TABLE traces
      ADD COLUMN IF NOT EXISTS semantic_score DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS hash_similarity DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS semantic_scored_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS semantic_cached BOOLEAN DEFAULT false
    `;

    // Create index for semantic scores (for analytics queries)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_traces_semantic_score
      ON traces(semantic_score)
      WHERE semantic_score IS NOT NULL
    `;

    // Create alerts table
    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        -- Primary key
        alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Link to trace
        trace_id VARCHAR(255) NOT NULL,
        span_id VARCHAR(255) NOT NULL,
        customer_id VARCHAR(255) NOT NULL,

        -- Alert details
        alert_type VARCHAR(50) CHECK (alert_type IN ('cost_spike', 'quality_drop', 'latency_spike', 'cost_and_quality')) NOT NULL,
        severity VARCHAR(10) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')) NOT NULL,

        -- Cost metrics (for cost_spike and cost_and_quality alerts)
        current_cost DOUBLE PRECISION,
        baseline_cost DOUBLE PRECISION,
        cost_increase_percent DOUBLE PRECISION,

        -- Quality metrics (for quality_drop and cost_and_quality alerts)
        hash_similarity DOUBLE PRECISION,
        semantic_score DOUBLE PRECISION,
        scoring_method VARCHAR(20) CHECK (scoring_method IN ('hash_only', 'semantic', 'both')),
        semantic_cached BOOLEAN DEFAULT false,

        -- Service context
        service_name VARCHAR(255) NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        model VARCHAR(255),

        -- Alert metadata
        reasoning TEXT,

        -- Timestamps
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),

        -- Alert state
        status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'acknowledged', 'resolved')) DEFAULT 'pending',
        acknowledged_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,

        -- Foreign key to traces
        FOREIGN KEY (trace_id, span_id) REFERENCES traces(trace_id, span_id) ON DELETE CASCADE
      )
    `;

    // Create indexes for common alert queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_customer_timestamp
      ON alerts(customer_id, timestamp DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_customer_status
      ON alerts(customer_id, status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_customer_type
      ON alerts(customer_id, alert_type)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_severity
      ON alerts(severity)
      WHERE status = 'pending'
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_trace
      ON alerts(trace_id, span_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alerts_service
      ON alerts(service_name, endpoint)
    `;
  },

  async down(sql) {
    // Drop alerts table
    await sql`DROP TABLE IF EXISTS alerts CASCADE`;

    // Remove semantic scoring columns from traces
    await sql`
      ALTER TABLE traces
      DROP COLUMN IF EXISTS semantic_score,
      DROP COLUMN IF EXISTS hash_similarity,
      DROP COLUMN IF EXISTS semantic_scored_at,
      DROP COLUMN IF EXISTS semantic_cached
    `;

    // Drop indexes (they'll be dropped with the table and columns)
  },
};
