#!/usr/bin/env bun
/**
 * Migration CLI - Run database migrations
 * Usage: bun run src/database/migrate-cli.ts
 */

import postgres from 'postgres';
import { Migrator } from './migrator';

const DATABASE_URL = Bun.env.DATABASE_URL;

async function runMigrations() {
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error(
      '   Example: export DATABASE_URL="postgres://lumina:lumina@localhost:5432/lumina"'
    );
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  console.log(`   Database: ${DATABASE_URL}`);

  const sql = postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    const migrator = new Migrator(sql);

    console.log('\n📊 Checking migration status...');
    const status = await migrator.status();

    const pending = status.filter((s) => !s.applied);
    const applied = status.filter((s) => s.applied);

    console.log(`\n   Applied: ${applied.length} migrations`);
    console.log(`   Pending: ${pending.length} migrations`);

    if (pending.length > 0) {
      console.log('\n🚀 Running pending migrations...');
      for (const migration of pending) {
        console.log(`   - ${migration.name} (v${migration.version})`);
      }

      await migrator.migrate();

      console.log('\n✅ All migrations completed successfully!');
    } else {
      console.log('\n✅ Database is up to date - no pending migrations');
    }

    // Show final status
    console.log('\n📋 Migration history:');
    const finalStatus = await migrator.status();
    for (const migration of finalStatus) {
      if (migration.applied) {
        console.log(
          `   ✓ v${migration.version} - ${migration.name} (${migration.appliedAt?.toISOString()})`
        );
      } else {
        console.log(`   ○ v${migration.version} - ${migration.name} (not applied)`);
      }
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigrations();
