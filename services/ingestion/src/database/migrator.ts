import type postgres from 'postgres';
import type { Migration } from './types';
import { migrations } from './migrations';

/**
 * Migration runner for database schema management
 */
export class Migrator {
  constructor(private sql: postgres.Sql) {}

  /**
   * Create migrations tracking table
   */
  private async createMigrationsTable(): Promise<void> {
    await this.sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
  }

  /**
   * Get list of applied migrations
   */
  private async getAppliedMigrations(): Promise<number[]> {
    const rows = await this.sql`
      SELECT version FROM schema_migrations ORDER BY version ASC
    `;
    return rows.map((row) => Number(row.version));
  }

  /**
   * Record a migration as applied
   */
  private async recordMigration(migration: Migration): Promise<void> {
    await this.sql`
      INSERT INTO schema_migrations (version, name)
      VALUES (${migration.version}, ${migration.name})
      ON CONFLICT (version) DO NOTHING
    `;
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    await this.createMigrationsTable();

    const appliedVersions = await this.getAppliedMigrations();
    const pendingMigrations = migrations.filter((m) => !appliedVersions.includes(m.version));

    if (pendingMigrations.length === 0) {
      return;
    }

    // Sort by version to ensure correct order
    pendingMigrations.sort((a, b) => a.version - b.version);

    for (const migration of pendingMigrations) {
      await migration.up(this.sql);
      await this.recordMigration(migration);
    }
  }

  /**
   * Rollback the last migration
   */
  async rollback(): Promise<void> {
    await this.createMigrationsTable();

    const appliedVersions = await this.getAppliedMigrations();
    if (appliedVersions.length === 0) {
      throw new Error('No migrations to rollback');
    }

    const lastVersion = appliedVersions[appliedVersions.length - 1];
    const migration = migrations.find((m) => m.version === lastVersion);

    if (!migration) {
      throw new Error(`Migration version ${lastVersion} not found`);
    }

    if (!migration.down) {
      throw new Error(`Migration ${migration.name} does not support rollback`);
    }

    await migration.down(this.sql);
    await this.sql`DELETE FROM schema_migrations WHERE version = ${lastVersion}`;
  }

  /**
   * Get migration status
   */
  async status(): Promise<
    Array<{
      version: number;
      name: string;
      applied: boolean;
      appliedAt?: Date;
    }>
  > {
    await this.createMigrationsTable();

    const appliedRows = await this.sql`
      SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC
    `;

    const appliedMap = new Map(
      appliedRows.map((row) => [
        Number(row.version),
        {
          name: row.name,
          appliedAt: new Date(row.applied_at),
        },
      ])
    );

    return migrations.map((migration) => {
      const applied = appliedMap.get(migration.version);
      return {
        version: migration.version,
        name: migration.name,
        applied: !!applied,
        appliedAt: applied?.appliedAt,
      };
    });
  }
}
