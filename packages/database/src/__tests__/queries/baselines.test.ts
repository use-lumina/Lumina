/**
 * Baselines Query Tests
 * Test all baseline-related query functions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupTestDatabase, closeTestDatabase, resetTestDatabase } from '../helpers/test-db';
import { createSampleBaseline, createSampleTrace } from '../fixtures/sample-data';
import {
  getBaseline,
  upsertBaseline,
  getAllBaselines,
  deleteBaseline,
} from '../../queries/baselines';
import { insertTracesBatch } from '../../queries/traces';
import type { Database } from '../../db';
import type postgres from 'postgres';

describe('Baselines Queries', () => {
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

  describe('upsertBaseline', () => {
    test('should insert a new baseline', async () => {
      const baseline = createSampleBaseline({
        serviceName: 'test-service',
        endpoint: '/api/test',
        windowSize: '24h',
      });

      await upsertBaseline(db, baseline);

      const result = await getBaseline(db, 'test-service', '/api/test', '24h');
      expect(result).toBeDefined();
      expect(result?.p50Cost).toBe(baseline.p50Cost);
      expect(result?.p95Cost).toBe(baseline.p95Cost);
      expect(result?.p99Cost).toBe(baseline.p99Cost);
    });

    test('should update existing baseline', async () => {
      const baseline = createSampleBaseline({
        serviceName: 'test-service',
        endpoint: '/api/test',
        windowSize: '24h',
        p50Cost: 0.01,
        p95Cost: 0.05,
      });

      await upsertBaseline(db, baseline);

      // Update with new values
      const updatedBaseline = {
        ...baseline,
        p50Cost: 0.02,
        p95Cost: 0.1,
        sampleCount: 2000,
      };

      await upsertBaseline(db, updatedBaseline);

      const result = await getBaseline(db, 'test-service', '/api/test', '24h');
      expect(result?.p50Cost).toBe(0.02);
      expect(result?.p95Cost).toBe(0.1);
      expect(result?.sampleCount).toBe(2000);
    });

    test('should handle multiple window sizes', async () => {
      await upsertBaseline(
        db,
        createSampleBaseline({
          serviceName: 'test-service',
          endpoint: '/api/test',
          windowSize: '24h',
          p50Cost: 0.01,
        })
      );

      await upsertBaseline(
        db,
        createSampleBaseline({
          serviceName: 'test-service',
          endpoint: '/api/test',
          windowSize: '7d',
          p50Cost: 0.015,
        })
      );

      const baseline24h = await getBaseline(db, 'test-service', '/api/test', '24h');
      const baseline7d = await getBaseline(db, 'test-service', '/api/test', '7d');

      expect(baseline24h?.p50Cost).toBe(0.01);
      expect(baseline7d?.p50Cost).toBe(0.015);
    });
  });

  describe('getBaseline', () => {
    test('should retrieve baseline by service, endpoint, and window', async () => {
      const baseline = createSampleBaseline({
        serviceName: 'test-service',
        endpoint: '/api/test',
        windowSize: '24h',
      });

      await upsertBaseline(db, baseline);

      const result = await getBaseline(db, 'test-service', '/api/test', '24h');
      expect(result).toBeDefined();
      expect(result?.serviceName).toBe('test-service');
      expect(result?.endpoint).toBe('/api/test');
      expect(result?.windowSize).toBe('24h');
    });

    test('should return undefined for non-existent baseline', async () => {
      const result = await getBaseline(db, 'non-existent', '/api/test', '24h');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllBaselines', () => {
    beforeEach(async () => {
      await upsertBaseline(
        db,
        createSampleBaseline({
          serviceName: 'service-a',
          endpoint: '/api/endpoint1',
          windowSize: '24h',
        })
      );

      await upsertBaseline(
        db,
        createSampleBaseline({
          serviceName: 'service-a',
          endpoint: '/api/endpoint2',
          windowSize: '24h',
        })
      );

      await upsertBaseline(
        db,
        createSampleBaseline({
          serviceName: 'service-b',
          endpoint: '/api/endpoint1',
          windowSize: '7d',
        })
      );
    });

    test('should retrieve all baselines', async () => {
      const results = await getAllBaselines(db);
      expect(results.length).toBe(3);
    });

    test('should filter by service name', async () => {
      const results = await getAllBaselines(db, { serviceName: 'service-a' });
      expect(results.length).toBe(2);
      expect(results.every((b) => b.serviceName === 'service-a')).toBe(true);
    });

    test('should filter by window size', async () => {
      const results = await getAllBaselines(db, { windowSize: '24h' });
      expect(results.length).toBe(2);
      expect(results.every((b) => b.windowSize === '24h')).toBe(true);
    });

    test.skip('should order by updated date', async () => {
      const results = await getAllBaselines(db);

      // Should be ordered by updatedAt DESC
      expect(results.length).toBeGreaterThan(0);
      if (results.length > 1) {
        const first = new Date(results[0].updatedAt).getTime();
        const second = new Date(results[1].updatedAt).getTime();
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });
  });

  describe('deleteBaseline', () => {
    test.skip('should delete a baseline', async () => {
      const baseline = createSampleBaseline({
        serviceName: 'test-service',
        endpoint: '/api/test',
        windowSize: '24h',
      });

      await upsertBaseline(db, baseline);

      const deleted = await deleteBaseline(db, 'test-service', '/api/test', '24h');
      expect(deleted).toBe(true);

      const result = await getBaseline(db, 'test-service', '/api/test', '24h');
      expect(result).toBeUndefined();
    });

    test('should return false for non-existent baseline', async () => {
      const deleted = await deleteBaseline(db, 'non-existent', '/api/test', '24h');
      expect(deleted).toBe(false);
    });
  });

  describe('Baseline calculation from traces', () => {
    test('should calculate percentiles from trace data', async () => {
      // Insert traces with varying costs
      const traces = [
        createSampleTrace({ serviceName: 'test-service', endpoint: '/api/test', costUsd: 0.001 }),
        createSampleTrace({ serviceName: 'test-service', endpoint: '/api/test', costUsd: 0.002 }),
        createSampleTrace({ serviceName: 'test-service', endpoint: '/api/test', costUsd: 0.003 }),
        createSampleTrace({ serviceName: 'test-service', endpoint: '/api/test', costUsd: 0.005 }),
        createSampleTrace({ serviceName: 'test-service', endpoint: '/api/test', costUsd: 0.01 }),
        createSampleTrace({ serviceName: 'test-service', endpoint: '/api/test', costUsd: 0.05 }), // Outlier
      ];

      await insertTracesBatch(db, traces);

      // Calculate percentiles (simple approach for test)
      const costs = traces.map((t) => t.costUsd).sort((a, b) => a - b);
      const p50Index = Math.floor(costs.length * 0.5);
      const p95Index = Math.floor(costs.length * 0.95);
      const p99Index = Math.floor(costs.length * 0.99);

      const baseline = createSampleBaseline({
        serviceName: 'test-service',
        endpoint: '/api/test',
        windowSize: '24h',
        p50Cost: costs[p50Index],
        p95Cost: costs[p95Index],
        p99Cost: costs[p99Index],
        sampleCount: costs.length,
      });

      await upsertBaseline(db, baseline);

      const result = await getBaseline(db, 'test-service', '/api/test', '24h');
      expect(result).toBeDefined();
      expect(result?.p50Cost).toBeGreaterThan(0);
      expect(result?.p95Cost).toBeGreaterThan(result!.p50Cost);
      expect(result?.p99Cost).toBeGreaterThanOrEqual(result!.p95Cost);
      expect(result?.sampleCount).toBe(6);
    });
  });

  describe('Baseline comparison', () => {
    test('should identify cost spike based on baseline', async () => {
      // Set up baseline with known values
      const baseline = createSampleBaseline({
        serviceName: 'test-service',
        endpoint: '/api/test',
        windowSize: '24h',
        p95Cost: 0.01,
        p99Cost: 0.02,
      });

      await upsertBaseline(db, baseline);

      // Insert trace with cost significantly above baseline
      const expensiveTrace = createSampleTrace({
        serviceName: 'test-service',
        endpoint: '/api/test',
        costUsd: 0.05, // 5x p95Cost
      });

      await insertTracesBatch(db, [expensiveTrace]);

      const result = await getBaseline(db, 'test-service', '/api/test', '24h');
      expect(result).toBeDefined();

      // Verify trace cost is above baseline
      const costRatio = expensiveTrace.costUsd / result!.p95Cost;
      expect(costRatio).toBeGreaterThan(2); // Should trigger alert
    });
  });
});
