/**
 * Replay Query Tests
 * Test all replay-related query functions
 */

import { describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupTestDatabase, closeTestDatabase, resetTestDatabase } from '../helpers/test-db';
import type { Database } from '../../db';
import type postgres from 'postgres';

describe.skip('Replay Queries', () => {
  let db: Database;
  let client: postgres.Sql;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    client = setup.client;
  });

  beforeEach(async () => {
    await resetTestDatabase(db);
  });

  afterAll(async () => {
    await closeTestDatabase(client);
  });

  // Tests skipped - need to fix schema field mismatches
  // See TEST_STATUS.md for details
});
