import postgres from 'postgres';

/**
 * PostgreSQL Database Manager for Replay Engine
 * Manages replay sets and execution results
 */
export class LuminaReplayDB {
  private sql: ReturnType<typeof postgres> | null = null;
  private isInitialized = false;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || Bun.env.DATABASE_URL;
    if (!this.connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create PostgreSQL connection
    this.sql = postgres(this.connectionString, {
      max: 10, // Connection pool size
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Test connection
    try {
      await this.sql`SELECT 1`;
      this.isInitialized = true;

      // Create replay tables
      await this.createTables();
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Create replay-related tables
   */
  private async createTables(): Promise<void> {
    if (!this.sql) return;

    // Create replay_sets table
    await this.sql`
      CREATE TABLE IF NOT EXISTS replay_sets (
        replay_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        trace_ids TEXT[] NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        total_traces INTEGER NOT NULL,
        completed_traces INTEGER DEFAULT 0,
        metadata JSONB
      )
    `;

    // Create replay_results table
    await this.sql`
      CREATE TABLE IF NOT EXISTS replay_results (
        result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        replay_id UUID NOT NULL REFERENCES replay_sets(replay_id) ON DELETE CASCADE,
        trace_id VARCHAR(255) NOT NULL,
        span_id VARCHAR(255) NOT NULL,
        original_response TEXT NOT NULL,
        replay_response TEXT NOT NULL,
        original_cost DECIMAL(10, 6) NOT NULL,
        replay_cost DECIMAL(10, 6) NOT NULL,
        original_latency INTEGER NOT NULL,
        replay_latency INTEGER NOT NULL,
        hash_similarity DECIMAL(5, 4),
        semantic_score DECIMAL(5, 4),
        diff_summary JSONB,
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'completed',
        FOREIGN KEY (trace_id, span_id) REFERENCES traces(trace_id, span_id) ON DELETE CASCADE
      )
    `;

    // Create indexes
    await this.sql`
      CREATE INDEX IF NOT EXISTS idx_replay_sets_status
      ON replay_sets(status)
    `;

    await this.sql`
      CREATE INDEX IF NOT EXISTS idx_replay_results_replay_id
      ON replay_results(replay_id)
    `;

    await this.sql`
      CREATE INDEX IF NOT EXISTS idx_replay_results_trace_id
      ON replay_results(trace_id)
    `;
  }

  /**
   * Get the SQL client
   */
  getClient() {
    if (!this.sql) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.sql;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.sql) {
      await this.sql.end();
      this.sql = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
let dbInstance: LuminaReplayDB | null = null;

/**
 * Get or create database instance
 */
export function getDB(connectionString?: string): LuminaReplayDB {
  if (!dbInstance) {
    dbInstance = new LuminaReplayDB(connectionString);
  }
  return dbInstance;
}
