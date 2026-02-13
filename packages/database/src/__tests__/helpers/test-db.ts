/**
 * Test Database Helpers
 * Utilities for setting up and tearing down test databases
 */

import { createDatabase, runMigrations, type Database } from '../../index';
import type postgres from 'postgres';

/**
 * Setup test database connection and run migrations
 */
export async function setupTestDatabase(): Promise<{
  db: Database;
  client: postgres.Sql;
}> {
  const testDbUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/lumina_test';

  const { db, client } = createDatabase({
    connectionString: testDbUrl,
    max: 5, // Smaller pool for tests
  });

  // Run migrations to set up schema
  try {
    await runMigrations(db, './src/migrations');
  } catch (error) {
    // Migrations might already be applied, continue
    console.log('Migrations already applied or error:', error);
  }

  return { db, client };
}

/**
 * Clean up all data from test database tables
 */
export async function cleanupTestDatabase(db: Database): Promise<void> {
  // Delete in correct order to respect foreign key constraints
  await db.execute('TRUNCATE TABLE replay_results CASCADE');
  await db.execute('TRUNCATE TABLE replay_sets CASCADE');
  await db.execute('TRUNCATE TABLE alerts CASCADE');
  await db.execute('TRUNCATE TABLE cost_baselines CASCADE');
  await db.execute('TRUNCATE TABLE traces CASCADE');
  await db.execute('TRUNCATE TABLE users CASCADE');
  await db.execute('TRUNCATE TABLE api_keys CASCADE');
}

/**
 * Reset test database (clean all data)
 */
export async function resetTestDatabase(db: Database): Promise<void> {
  await cleanupTestDatabase(db);
}

/**
 * Close database connection
 */
export async function closeTestDatabase(client: postgres.Sql): Promise<void> {
  await client.end();
}
