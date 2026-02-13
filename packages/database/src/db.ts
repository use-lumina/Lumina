import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { schema } from './schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeout?: number;
  connectTimeout?: number;
}

/**
 * Database instance type with full schema
 */
export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Create a new database connection with Drizzle ORM
 *
 * @param config - Database connection configuration
 * @returns Object containing Drizzle database instance and raw postgres client
 *
 * @example
 * ```typescript
 * const { db, client } = createDatabase({
 *   connectionString: process.env.DATABASE_URL,
 *   max: 10,
 * });
 *
 * // Use Drizzle queries
 * const traces = await db.select().from(schema.traces).limit(10);
 *
 * // Close when done
 * await client.end();
 * ```
 */
export function createDatabase(config: DatabaseConfig): {
  db: Database;
  client: postgres.Sql;
} {
  // Create postgres connection with pooling
  const client = postgres(config.connectionString, {
    max: config.max ?? 10, // Maximum pool size
    idle_timeout: config.idleTimeout ?? 20, // Close idle connections after 20s
    connect_timeout: config.connectTimeout ?? 10, // Connection timeout
  });

  // Create Drizzle instance with schema
  const db = drizzle(client, { schema });

  return { db, client };
}

/**
 * Run database migrations
 *
 * @param db - Drizzle database instance
 * @param migrationsFolder - Path to migrations folder (defaults to './migrations')
 *
 * @example
 * ```typescript
 * const { db, client } = createDatabase({ connectionString: process.env.DATABASE_URL });
 * await runMigrations(db);
 * await client.end();
 * ```
 */
export async function runMigrations(
  db: Database,
  migrationsFolder = './migrations'
): Promise<void> {
  try {
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Test database connection
 *
 * @param client - Postgres client
 * @returns Promise that resolves if connection is successful
 *
 * @example
 * ```typescript
 * const { client } = createDatabase({ connectionString: process.env.DATABASE_URL });
 * await testConnection(client);
 * ```
 */
export async function testConnection(client: postgres.Sql): Promise<void> {
  try {
    await client`SELECT 1`;
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

/**
 * Create a singleton database instance
 * Useful for services that need a single shared connection
 *
 * @param config - Database connection configuration
 * @returns Function to get the singleton database instance
 *
 * @example
 * ```typescript
 * // In your service's database/client.ts
 * export const getDatabase = createDatabaseSingleton({
 *   connectionString: process.env.DATABASE_URL || '',
 * });
 *
 * // Use throughout your service
 * const db = getDatabase();
 * ```
 */
export function createDatabaseSingleton(config: DatabaseConfig): () => Database {
  let instance: { db: Database; client: postgres.Sql } | null = null;

  return (): Database => {
    if (!instance) {
      instance = createDatabase(config);
    }
    return instance.db;
  };
}

/**
 * Create a singleton with both database and client
 * Useful when you need access to raw postgres client for complex queries
 *
 * @param config - Database connection configuration
 * @returns Object with getDatabase and getClient functions
 *
 * @example
 * ```typescript
 * // In your service's database/client.ts
 * const { getDatabase, getClient } = createDatabaseSingletonWithClient({
 *   connectionString: process.env.DATABASE_URL || '',
 * });
 * export { getDatabase, getClient };
 * ```
 */
export function createDatabaseSingletonWithClient(config: DatabaseConfig): {
  getDatabase: () => Database;
  getClient: () => postgres.Sql;
} {
  let instance: { db: Database; client: postgres.Sql } | null = null;

  const getDatabase = (): Database => {
    if (!instance) {
      instance = createDatabase(config);
    }
    return instance.db;
  };

  const getClient = (): postgres.Sql => {
    if (!instance) {
      instance = createDatabase(config);
    }
    return instance.client;
  };

  return { getDatabase, getClient };
}
