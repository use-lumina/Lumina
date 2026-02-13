/**
 * Analytics Query Tests
 * Test all analytics-related query functions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupTestDatabase, closeTestDatabase, resetTestDatabase } from '../helpers/test-db';
import { createSampleTrace, createSampleTraces } from '../fixtures/sample-data';
import {
  getCostTimeline,
  getCostBreakdown,
  getPercentiles,
  getEndpointTrends,
  getAnalyticsSummary,
} from '../../queries/analytics';
import { insertTracesBatch } from '../../queries/traces';
import type { Database } from '../../db';
import type postgres from 'postgres';

describe.skip('Analytics Queries', () => {
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

  describe('getCostTimeline', () => {
    beforeEach(async () => {
      const now = new Date();
      const traces = [
        createSampleTrace({
          customerId: 'customer-1',
          timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
          costUsd: 0.01,
          tokens: 100,
          latencyMs: 500,
        }),
        createSampleTrace({
          customerId: 'customer-1',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          costUsd: 0.02,
          tokens: 200,
          latencyMs: 600,
        }),
        createSampleTrace({
          customerId: 'customer-1',
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          costUsd: 0.03,
          tokens: 300,
          latencyMs: 700,
        }),
      ];

      await insertTracesBatch(db, traces);
    });

    test('should return timeline with hourly granularity', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 4 * 60 * 60 * 1000);

      const timeline = await getCostTimeline(db, {
        customerId: 'customer-1',
        startTime,
        endTime: now,
        granularity: 'hour',
      });

      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0]).toHaveProperty('timeBucket');
      expect(timeline[0]).toHaveProperty('count');
      expect(timeline[0]).toHaveProperty('totalCost');
      expect(timeline[0]).toHaveProperty('avgLatency');
    });

    test('should return timeline with daily granularity', async () => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const timeline = await getCostTimeline(db, {
        customerId: 'customer-1',
        startTime,
        endTime: now,
        granularity: 'day',
      });

      expect(timeline.length).toBeGreaterThanOrEqual(0);
      timeline.forEach((point) => {
        expect(point.count).toBeGreaterThanOrEqual(0);
        expect(point.totalCost).toBeGreaterThanOrEqual(0);
      });
    });

    test('should filter by service name', async () => {
      const traces = createSampleTraces(5, {
        customerId: 'customer-1',
        serviceName: 'specific-service',
      });

      await insertTracesBatch(db, traces);

      const now = new Date();
      const startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const timeline = await getCostTimeline(db, {
        customerId: 'customer-1',
        serviceName: 'specific-service',
        startTime,
        endTime: now,
        granularity: 'hour',
      });

      expect(timeline.length).toBeGreaterThan(0);
    });

    test('should filter by environment', async () => {
      const traces = createSampleTraces(3, {
        customerId: 'customer-1',
        environment: 'live',
      });

      await insertTracesBatch(db, traces);

      const now = new Date();
      const startTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const timeline = await getCostTimeline(db, {
        customerId: 'customer-1',
        environment: 'live',
        startTime,
        endTime: now,
        granularity: 'hour',
      });

      expect(timeline.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCostBreakdown', () => {
    beforeEach(async () => {
      const traces = [
        createSampleTrace({
          customerId: 'customer-1',
          serviceName: 'service-a',
          model: 'gpt-4',
          costUsd: 0.05,
          tokens: 500,
        }),
        createSampleTrace({
          customerId: 'customer-1',
          serviceName: 'service-a',
          model: 'gpt-4',
          costUsd: 0.06,
          tokens: 600,
        }),
        createSampleTrace({
          customerId: 'customer-1',
          serviceName: 'service-b',
          model: 'gpt-3.5-turbo',
          costUsd: 0.01,
          tokens: 300,
        }),
      ];

      await insertTracesBatch(db, traces);
    });

    test('should breakdown by service', async () => {
      const breakdown = await getCostBreakdown(db, {
        customerId: 'customer-1',
        groupBy: 'service',
      });

      expect(breakdown.length).toBe(2);
      expect(breakdown.find((b) => b.dimension === 'service-a')).toBeDefined();
      expect(breakdown.find((b) => b.dimension === 'service-b')).toBeDefined();

      const serviceA = breakdown.find((b) => b.dimension === 'service-a')!;
      expect(serviceA.count).toBe(2);
      expect(serviceA.totalCost).toBeCloseTo(0.11, 2);
    });

    test('should breakdown by model', async () => {
      const breakdown = await getCostBreakdown(db, {
        customerId: 'customer-1',
        groupBy: 'model',
      });

      expect(breakdown.length).toBe(2);
      expect(breakdown.find((b) => b.dimension === 'gpt-4')).toBeDefined();
      expect(breakdown.find((b) => b.dimension === 'gpt-3.5-turbo')).toBeDefined();

      const gpt4 = breakdown.find((b) => b.dimension === 'gpt-4')!;
      expect(gpt4.count).toBe(2);
      expect(gpt4.totalCost).toBeCloseTo(0.11, 2);
    });

    test('should breakdown by endpoint', async () => {
      const traces = [
        createSampleTrace({
          customerId: 'customer-1',
          endpoint: '/api/chat',
          costUsd: 0.05,
        }),
        createSampleTrace({
          customerId: 'customer-1',
          endpoint: '/api/completion',
          costUsd: 0.03,
        }),
      ];

      await insertTracesBatch(db, traces);

      const breakdown = await getCostBreakdown(db, {
        customerId: 'customer-1',
        groupBy: 'endpoint',
      });

      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown.every((b) => b.dimension)).toBe(true);
    });

    test('should filter by time range', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const breakdown = await getCostBreakdown(db, {
        customerId: 'customer-1',
        groupBy: 'service',
        startTime: hourAgo,
        endTime: now,
      });

      expect(breakdown.length).toBeGreaterThanOrEqual(0);
    });

    test('should order by cost descending', async () => {
      const breakdown = await getCostBreakdown(db, {
        customerId: 'customer-1',
        groupBy: 'service',
      });

      if (breakdown.length > 1) {
        expect(breakdown[0].totalCost).toBeGreaterThanOrEqual(breakdown[1].totalCost);
      }
    });
  });

  describe('getPercentiles', () => {
    beforeEach(async () => {
      // Insert traces with varying costs
      const costs = [0.001, 0.002, 0.003, 0.005, 0.01, 0.02, 0.05, 0.1];
      const traces = costs.map((cost) =>
        createSampleTrace({
          customerId: 'customer-1',
          serviceName: 'test-service',
          endpoint: '/api/test',
          costUsd: cost,
        })
      );

      await insertTracesBatch(db, traces);
    });

    test('should calculate cost percentiles', async () => {
      const percentiles = await getPercentiles(db, {
        customerId: 'customer-1',
        serviceName: 'test-service',
        endpoint: '/api/test',
        metric: 'cost',
      });

      expect(percentiles).toBeDefined();
      expect(percentiles.p50).toBeGreaterThan(0);
      expect(percentiles.p95).toBeGreaterThan(percentiles.p50);
      expect(percentiles.p99).toBeGreaterThanOrEqual(percentiles.p95);
    });

    test('should calculate latency percentiles', async () => {
      const latencies = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      const traces = latencies.map((latency) =>
        createSampleTrace({
          customerId: 'customer-1',
          serviceName: 'test-service',
          endpoint: '/api/test',
          latencyMs: latency,
        })
      );

      await insertTracesBatch(db, traces);

      const percentiles = await getPercentiles(db, {
        customerId: 'customer-1',
        serviceName: 'test-service',
        endpoint: '/api/test',
        metric: 'latency',
      });

      expect(percentiles).toBeDefined();
      expect(percentiles.p50).toBeGreaterThan(0);
      expect(percentiles.p95).toBeGreaterThan(percentiles.p50);
      expect(percentiles.p99).toBeGreaterThanOrEqual(percentiles.p95);
    });

    test('should calculate token percentiles', async () => {
      const percentiles = await getPercentiles(db, {
        customerId: 'customer-1',
        serviceName: 'test-service',
        endpoint: '/api/test',
        metric: 'tokens',
      });

      expect(percentiles).toBeDefined();
      expect(percentiles.p50).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getEndpointTrends', () => {
    beforeEach(async () => {
      const endpoints = ['/api/chat', '/api/completion', '/api/search'];
      const traces = endpoints.flatMap((endpoint) =>
        Array.from({ length: 5 }, (_, i) =>
          createSampleTrace({
            customerId: 'customer-1',
            endpoint,
            costUsd: 0.01 * (i + 1),
            tokens: 100 * (i + 1),
            latencyMs: 100 * (i + 1),
          })
        )
      );

      await insertTracesBatch(db, traces);
    });

    test('should return trends for all endpoints', async () => {
      const trends = await getEndpointTrends(db, {
        customerId: 'customer-1',
      });

      expect(trends.length).toBe(3);
      expect(trends.every((t) => t.endpoint)).toBe(true);
      expect(trends.every((t) => t.count > 0)).toBe(true);
      expect(trends.every((t) => t.totalCost > 0)).toBe(true);
    });

    test('should filter by service name', async () => {
      const traces = createSampleTraces(5, {
        customerId: 'customer-1',
        serviceName: 'specific-service',
        endpoint: '/api/specific',
      });

      await insertTracesBatch(db, traces);

      const trends = await getEndpointTrends(db, {
        customerId: 'customer-1',
        serviceName: 'specific-service',
      });

      expect(trends.length).toBeGreaterThan(0);
      expect(trends.find((t) => t.endpoint === '/api/specific')).toBeDefined();
    });

    test('should include aggregated metrics', async () => {
      const trends = await getEndpointTrends(db, {
        customerId: 'customer-1',
      });

      trends.forEach((trend) => {
        expect(trend).toHaveProperty('count');
        expect(trend).toHaveProperty('totalCost');
        expect(trend).toHaveProperty('avgCost');
        expect(trend).toHaveProperty('avgLatency');
        expect(trend).toHaveProperty('avgTokens');
      });
    });

    test('should order by total cost descending', async () => {
      const trends = await getEndpointTrends(db, {
        customerId: 'customer-1',
      });

      if (trends.length > 1) {
        expect(trends[0].totalCost).toBeGreaterThanOrEqual(trends[1].totalCost);
      }
    });

    test('should apply limit', async () => {
      const trends = await getEndpointTrends(db, {
        customerId: 'customer-1',
        limit: 2,
      });

      expect(trends.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getAnalyticsSummary', () => {
    beforeEach(async () => {
      const now = new Date();
      const traces = [
        // Recent traces (last 24h)
        ...Array.from({ length: 10 }, (_, i) =>
          createSampleTrace({
            customerId: 'customer-1',
            timestamp: new Date(now.getTime() - i * 60 * 60 * 1000), // Last 10 hours
            costUsd: 0.01,
            tokens: 100,
            latencyMs: 500,
            status: 'success',
          })
        ),
        // One error trace
        createSampleTrace({
          customerId: 'customer-1',
          timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
          costUsd: 0.01,
          tokens: 100,
          latencyMs: 500,
          status: 'error',
        }),
        // Older traces (last 7d)
        ...Array.from({ length: 5 }, (_, i) =>
          createSampleTrace({
            customerId: 'customer-1',
            timestamp: new Date(now.getTime() - (2 + i) * 24 * 60 * 60 * 1000), // 2-6 days ago
            costUsd: 0.02,
            tokens: 200,
            latencyMs: 600,
            status: 'success',
          })
        ),
      ];

      await insertTracesBatch(db, traces);
    });

    test('should return comprehensive summary', async () => {
      const summary = await getAnalyticsSummary(db, {
        customerId: 'customer-1',
      });

      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('totalTraces');
      expect(summary).toHaveProperty('totalCost');
      expect(summary).toHaveProperty('totalTokens');
      expect(summary).toHaveProperty('avgLatency');
      expect(summary).toHaveProperty('successRate');
    });

    test('should calculate correct totals', async () => {
      const summary = await getAnalyticsSummary(db, {
        customerId: 'customer-1',
      });

      expect(summary.totalTraces).toBe(16); // 10 + 1 + 5
      expect(summary.totalCost).toBeGreaterThan(0);
      expect(summary.totalTokens).toBeGreaterThan(0);
    });

    test('should calculate success rate', async () => {
      const summary = await getAnalyticsSummary(db, {
        customerId: 'customer-1',
      });

      // 15 success, 1 error = 93.75% success rate
      expect(summary.successRate).toBeGreaterThan(90);
      expect(summary.successRate).toBeLessThan(100);
    });

    test('should filter by time range', async () => {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const summary = await getAnalyticsSummary(db, {
        customerId: 'customer-1',
        startTime: dayAgo,
        endTime: now,
      });

      // Should only include last 24h traces (11 traces)
      expect(summary.totalTraces).toBe(11);
    });

    test('should filter by service', async () => {
      const traces = createSampleTraces(5, {
        customerId: 'customer-1',
        serviceName: 'specific-service',
      });

      await insertTracesBatch(db, traces);

      const summary = await getAnalyticsSummary(db, {
        customerId: 'customer-1',
        serviceName: 'specific-service',
      });

      expect(summary.totalTraces).toBe(5);
    });

    test('should filter by environment', async () => {
      const traces = createSampleTraces(3, {
        customerId: 'customer-1',
        environment: 'live',
      });

      await insertTracesBatch(db, traces);

      const summary = await getAnalyticsSummary(db, {
        customerId: 'customer-1',
        environment: 'live',
      });

      expect(summary.totalTraces).toBeGreaterThanOrEqual(3);
    });

    test('should handle empty results', async () => {
      await resetTestDatabase(db);

      const summary = await getAnalyticsSummary(db, {
        customerId: 'non-existent-customer',
      });

      expect(summary.totalTraces).toBe(0);
      expect(summary.totalCost).toBe(0);
      expect(summary.totalTokens).toBe(0);
    });
  });
});
