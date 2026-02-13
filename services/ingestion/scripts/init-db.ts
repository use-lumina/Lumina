/**
 * Initialize PostgreSQL database for Lumina
 * Runs Drizzle migrations to create tables and indexes
 */

import { createDatabase, runMigrations } from '@lumina/database';

async function main() {
  console.log('Initializing PostgreSQL database for Lumina...');

  const { db, client } = createDatabase({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/lumina',
  });

  try {
    // Run migrations (creates all tables and indexes)
    await runMigrations(db, '../../../packages/database/src/migrations');
    console.log('✓ Database schema created successfully');
    console.log('  - traces table');
    console.log('  - alerts table');
    console.log('  - cost_baselines table');
    console.log('  - api_keys table');
    console.log('  - users table');
    console.log('  - replay_sets table');
    console.log('  - replay_results table');
    console.log('  - All indexes created');

    await client.end();
    console.log('\n✓ Database initialization complete');
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
}

main();
