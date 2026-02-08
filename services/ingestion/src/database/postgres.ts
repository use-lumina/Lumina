import postgres from 'postgres';
import { Migrator } from './migrator';
import { TracesTable } from './tables/traces';
import { BaselinesTable } from './tables/baselines';
import { AlertsTable } from './tables/alerts';

/**
 * PostgreSQL Database Manager for Lumina traces
 * Handles connection initialization and provides access to Tables
 */
export class LuminaDB {
  private sql: ReturnType<typeof postgres> | null = null;
  private isInitialized = false;
  private connectionString: string;

  // Public table instances
  public traces!: TracesTable;
  public baselines!: BaselinesTable;
  public alerts!: AlertsTable;

  public getClient(): ReturnType<typeof postgres> {
    if (!this.sql) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.sql;
  }

  constructor(connectionString?: string) {
    const finalConnectionString = connectionString || Bun.env.DATABASE_URL;
    if (!finalConnectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    this.connectionString = finalConnectionString;
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create PostgreSQL connection
    this.sql = postgres(this.connectionString, {
      max: 10, // Connection pool size
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Run migrations
    const migrator = new Migrator(this.sql);
    await migrator.migrate();

    // Initialize tables
    this.traces = new TracesTable(this.sql);
    this.baselines = new BaselinesTable(this.sql);
    this.alerts = new AlertsTable(this.sql);

    this.isInitialized = true;
  }

  /**
   * Convenience method to insert a batch of traces
   */
  async insertBatch(traces: any[]): Promise<void> {
    return this.traces.insertBatch(traces);
  }

  /**
   * Convenience method to query traces
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
  }): Promise<any[]> {
    return this.traces.queryTraces(options);
  }

  /**
   * Convenience method to get metrics
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
    return this.traces.getMetrics(options);
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
let dbInstance: LuminaDB | null = null;

/**
 * Get or create database instance
 */
export function getDB(connectionString?: string): LuminaDB {
  if (!dbInstance) {
    dbInstance = new LuminaDB(connectionString);
  }
  return dbInstance;
}
