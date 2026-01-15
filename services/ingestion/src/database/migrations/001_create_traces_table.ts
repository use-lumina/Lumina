import type { Migration } from '../types';

export const createTracesTable: Migration = {
  name: 'create_traces_table',
  version: 1,

  async up(sql) {
    // Create traces table
    await sql`
      CREATE TABLE IF NOT EXISTS traces (
        -- Identifiers
        trace_id VARCHAR(255) NOT NULL,
        span_id VARCHAR(255) NOT NULL,
        parent_span_id VARCHAR(255),
        customer_id VARCHAR(255) NOT NULL,

        -- Composite primary key for trace_id + span_id
        PRIMARY KEY (trace_id, span_id),

        -- Timestamps
        timestamp TIMESTAMPTZ NOT NULL,

        -- Service context
        service_name VARCHAR(255) NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        environment VARCHAR(10) CHECK (environment IN ('live', 'test')) DEFAULT 'live',

        -- Model information
        model VARCHAR(255) NOT NULL,
        provider VARCHAR(50) CHECK (provider IN ('openai', 'anthropic', 'cohere', 'other')),

        -- Request/Response
        prompt TEXT,
        response TEXT,

        -- Metrics
        tokens INTEGER NOT NULL,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        latency_ms DOUBLE PRECISION NOT NULL,
        cost_usd DOUBLE PRECISION DEFAULT 0,

        -- Metadata
        metadata JSONB,
        tags TEXT[],

        -- Status
        status VARCHAR(20) CHECK (status IN ('success', 'error')) NOT NULL,
        error_message TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create indexes for common query patterns
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_timestamp
      ON traces(customer_id, timestamp DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_environment
      ON traces(customer_id, environment)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_status
      ON traces(customer_id, status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_service
      ON traces(customer_id, service_name)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_model
      ON traces(model)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_provider
      ON traces(provider)
    `;
  },

  async down(sql) {
    await sql`DROP TABLE IF EXISTS traces CASCADE`;
  },
};
