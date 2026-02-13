/**
 * @lumina/database
 *
 * Shared database package with Drizzle ORM
 * Provides schemas, connection management, and reusable query builders
 */

// Export database connection utilities
export {
  createDatabase,
  createDatabaseSingleton,
  createDatabaseSingletonWithClient,
  runMigrations,
  testConnection,
  type Database,
  type DatabaseConfig,
} from './db';

// Export all schemas and types
export * from './schema';

// Export query builders (will be added in next steps)
export * from './queries';
