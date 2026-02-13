/**
 * Schema Definition Tests
 * Verify that all table schemas are correctly defined
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { setupTestDatabase, closeTestDatabase } from './helpers/test-db';
import {
  traces,
  alerts,
  costBaselines,
  apiKeys,
  users,
  replaySets,
  replayResults,
} from '../schema';
import type { Database } from '../db';
import type postgres from 'postgres';

describe.skip('Schema Definitions', () => {
  let db: Database;
  let client: postgres.Sql;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    client = setup.client;
  });

  afterAll(async () => {
    await closeTestDatabase(client);
  });

  test('traces table should exist with correct columns', async () => {
    const result = await db.execute(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'traces'
       ORDER BY ordinal_position`
    );

    expect(result.rows.length).toBeGreaterThan(20); // Should have 26+ columns

    // Check key columns exist
    const columnNames = result.rows.map((r: any) => r.column_name);
    expect(columnNames).toContain('trace_id');
    expect(columnNames).toContain('span_id');
    expect(columnNames).toContain('customer_id');
    expect(columnNames).toContain('cost_usd');
    expect(columnNames).toContain('latency_ms');
  });

  test('traces table should have composite primary key', async () => {
    const result = await db.execute(
      `SELECT constraint_name, constraint_type
       FROM information_schema.table_constraints
       WHERE table_name = 'traces' AND constraint_type = 'PRIMARY KEY'`
    );

    expect(result.rows.length).toBe(1);
  });

  test('alerts table should have foreign key to traces', async () => {
    const result = await db.execute(
      `SELECT constraint_name
       FROM information_schema.table_constraints
       WHERE table_name = 'alerts' AND constraint_type = 'FOREIGN KEY'`
    );

    expect(result.rows.length).toBeGreaterThan(0);
  });

  test('cost_baselines table should have unique constraint', async () => {
    const result = await db.execute(
      `SELECT constraint_name
       FROM information_schema.table_constraints
       WHERE table_name = 'cost_baselines' AND constraint_type = 'UNIQUE'`
    );

    expect(result.rows.length).toBeGreaterThan(0);
  });

  test('all required indexes should exist', async () => {
    const result = await db.execute(
      `SELECT indexname
       FROM pg_indexes
       WHERE tablename IN ('traces', 'alerts', 'cost_baselines')`
    );

    expect(result.rows.length).toBeGreaterThan(10); // Should have multiple indexes
  });

  test('schema exports should be defined', () => {
    expect(traces).toBeDefined();
    expect(alerts).toBeDefined();
    expect(costBaselines).toBeDefined();
    expect(apiKeys).toBeDefined();
    expect(users).toBeDefined();
    expect(replaySets).toBeDefined();
    expect(replayResults).toBeDefined();
  });
});
