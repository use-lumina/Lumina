/**
 * Initialize PostgreSQL database for Lumina
 * Creates tables and indexes
 */

import { getDB } from '../src/database/postgres';

async function main() {
  console.log('Initializing PostgreSQL database for Lumina...');

  const db = getDB();

  try {
    // Initialize database (creates all tables and indexes)
    await db.initialize();
    console.log('✓ Database schema created successfully');
    console.log('  - traces table');
    console.log('  - cost_baselines table');
    console.log('  - All indexes created');

    await db.close();
    console.log('\n✓ Database initialization complete');
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
}

main();
