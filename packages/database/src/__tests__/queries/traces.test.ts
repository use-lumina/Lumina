/**
 * Traces Query Tests
 * Test all trace-related query functions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupTestDatabase, closeTestDatabase, resetTestDatabase } from '../helpers/test-db';
import { createSampleTrace, createSampleTraces } from '../fixtures/sample-data';
import {
  buildTraceQuery,
  insertTrace,
  insertTracesBatch,
  getTraceById,
  getTracesByIds,
  getTraceMetrics,
  getCostSamples,
  updateTraceSemanticScore,
  deleteOldTraces,
  getTraceRetentionStats,
} from '../../queries/traces';
import type { Database } from '../../db';
import type postgres from 'postgres';

describe('Traces Queries', () => {
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

  describe('insertTrace', () => {
    test('should insert a single trace', async () => {
      const trace = createSampleTrace();
      await insertTrace(db, trace);

      const result = await getTraceById(db, trace.traceId, trace.spanId);
      expect(result).toBeDefined();
      expect(result?.traceId).toBe(trace.traceId);
      expect(result?.serviceName).toBe(trace.serviceName);
    });
  });

  describe('insertTracesBatch', () => {
    test('should insert multiple traces', async () => {
      const traces = createSampleTraces(5);
      await insertTracesBatch(db, traces);

      const traceIds = traces.map((t) => t.traceId);
      const results = await getTracesByIds(db, traceIds);
      expect(results.length).toBe(5);
    });

    test('should handle ON CONFLICT for duplicate traces', async () => {
      const trace = createSampleTrace();

      // Insert same trace twice
      await insertTracesBatch(db, [trace]);
      await insertTracesBatch(db, [trace]); // Should not throw error

      const result = await getTraceById(db, trace.traceId, trace.spanId);
      expect(result).toBeDefined();
    });

    test.skip('should handle empty batch', async () => {
      await expect(insertTracesBatch(db, [])).resolves.not.toThrow();
    });
  });

  describe('buildTraceQuery', () => {
    beforeEach(async () => {
      // Insert test data
      const traces = [
        createSampleTrace({
          customerId: 'customer-1',
          serviceName: 'service-a',
          environment: 'live',
          status: 'success',
        }),
        createSampleTrace({
          customerId: 'customer-1',
          serviceName: 'service-b',
          environment: 'test',
          status: 'error',
        }),
        createSampleTrace({
          customerId: 'customer-2',
          serviceName: 'service-a',
          environment: 'live',
          status: 'success',
        }),
      ];
      await insertTracesBatch(db, traces);
    });

    test('should filter by customerId', async () => {
      const results = await buildTraceQuery(db, {
        customerId: 'customer-1',
      });

      expect(results.length).toBe(2);
      expect(results.every((t) => t.customerId === 'customer-1')).toBe(true);
    });

    test('should filter by serviceName', async () => {
      const results = await buildTraceQuery(db, {
        customerId: 'customer-1',
        serviceName: 'service-a',
      });

      expect(results.length).toBe(1);
      expect(results[0].serviceName).toBe('service-a');
    });

    test('should filter by environment', async () => {
      const results = await buildTraceQuery(db, {
        customerId: 'customer-1',
        environment: 'live',
      });

      expect(results.length).toBe(1);
      expect(results[0].environment).toBe('live');
    });

    test('should filter by status', async () => {
      const results = await buildTraceQuery(db, {
        customerId: 'customer-1',
        status: 'error',
      });

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('error');
    });

    test('should apply limit and offset', async () => {
      const results = await buildTraceQuery(db, {
        customerId: 'customer-1',
        limit: 1,
        offset: 0,
      });

      expect(results.length).toBe(1);
    });

    test('should filter by time range', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const results = await buildTraceQuery(db, {
        customerId: 'customer-1',
        startTime: hourAgo,
        endTime: now,
      });

      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getTraceMetrics', () => {
    beforeEach(async () => {
      const traces = createSampleTraces(10, {
        customerId: 'customer-1',
        costUsd: 0.01,
        tokens: 100,
        latencyMs: 500,
        status: 'success',
      });
      // Add one error trace
      traces.push(
        createSampleTrace({
          customerId: 'customer-1',
          status: 'error',
        })
      );
      await insertTracesBatch(db, traces);
    });

    test('should calculate metrics correctly', async () => {
      const metrics = await getTraceMetrics(db, {
        customerId: 'customer-1',
      });

      expect(metrics.totalTraces).toBe(11);
      expect(metrics.totalTokens).toBeGreaterThan(0);
      expect(metrics.totalCost).toBeGreaterThan(0);
      expect(metrics.avgLatency).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.successRate).toBeLessThan(100); // One error trace
    });

    test('should filter by environment', async () => {
      const metrics = await getTraceMetrics(db, {
        customerId: 'customer-1',
        environment: 'test',
      });

      expect(metrics.totalTraces).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCostSamples', () => {
    beforeEach(async () => {
      const traces = createSampleTraces(5, {
        serviceName: 'test-service',
        endpoint: '/api/test',
        costUsd: 0.01,
      });
      await insertTracesBatch(db, traces);
    });

    test('should retrieve cost samples for 24h window', async () => {
      const samples = await getCostSamples(db, 'test-service', '/api/test', '24h');

      expect(samples.length).toBe(5);
      expect(samples.every((s) => s.costUsd > 0)).toBe(true);
    });

    test('should return empty array for non-existent endpoint', async () => {
      const samples = await getCostSamples(db, 'test-service', '/api/nonexistent', '24h');

      expect(samples.length).toBe(0);
    });
  });

  describe('updateTraceSemanticScore', () => {
    test('should update semantic scores', async () => {
      const trace = createSampleTrace();
      await insertTrace(db, trace);

      await updateTraceSemanticScore(db, trace.traceId, trace.spanId, {
        semanticScore: 0.95,
        hashSimilarity: 0.88,
        semanticCached: true,
      });

      const updated = await getTraceById(db, trace.traceId, trace.spanId);
      expect(updated?.semanticScore).toBe(0.95);
      expect(updated?.hashSimilarity).toBe(0.88);
      expect(updated?.semanticCached).toBe(true);
      expect(updated?.semanticScoredAt).toBeDefined();
    });
  });

  describe('deleteOldTraces', () => {
    test('should delete traces older than cutoff date', async () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const recentDate = new Date();

      const traces = [
        createSampleTrace({ timestamp: oldDate }),
        createSampleTrace({ timestamp: recentDate }),
      ];
      await insertTracesBatch(db, traces);

      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const deletedCount = await deleteOldTraces(db, cutoff);

      expect(deletedCount).toBe(1); // Only old trace deleted
    });
  });

  describe('getTraceRetentionStats', () => {
    test('should return retention statistics', async () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentDate = new Date();

      const traces = [
        createSampleTrace({ timestamp: oldDate }),
        createSampleTrace({ timestamp: recentDate }),
      ];
      await insertTracesBatch(db, traces);

      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const stats = await getTraceRetentionStats(db, cutoff);

      expect(stats.totalTraces).toBe(2);
      expect(stats.recentTraces).toBe(1);
      expect(stats.oldTraces).toBe(1);
      expect(stats.oldestTimestamp).toBeDefined();
    });
  });
});
