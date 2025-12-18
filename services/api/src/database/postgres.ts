import postgres from 'postgres';

/**
 * PostgreSQL Database Manager for Query API
 * Read-only access for dashboard queries
 */
export class LuminaQueryDB {
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
   * Initialize database connection
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
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
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
let dbInstance: LuminaQueryDB | null = null;

/**
 * Get or create database instance
 */
export function getDB(connectionString?: string): LuminaQueryDB {
  if (!dbInstance) {
    dbInstance = new LuminaQueryDB(connectionString);
  }
  return dbInstance;
}
