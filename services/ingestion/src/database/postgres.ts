import postgres from 'postgres';
import { Migrator } from './migrator';
import { TracesTable } from './tables/traces';
import { BaselinesTable } from './tables/baselines';

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

  constructor(connectionString?: string) {
    this.connectionString =
      connectionString || Bun.env.DATABASE_URL || 'postgres://evansonigiri@localhost:5432/lumina';
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

    this.isInitialized = true;
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
