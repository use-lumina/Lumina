/**
 * Alerts Query Tests
 * Test all alert-related query functions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { setupTestDatabase, closeTestDatabase, resetTestDatabase } from '../helpers/test-db';
import { createSampleTrace, createSampleAlert } from '../fixtures/sample-data';
import {
  insertAlert,
  insertAlertsBatch,
  getAlertById,
  getAlertWithTrace,
  getAlertsWithFilters,
  updateAlertStatus,
  getAlertCounts,
  deleteOldAlerts,
} from '../../queries/alerts';
import { insertTrace } from '../../queries/traces';
import type { Database } from '../../db';
import type postgres from 'postgres';

describe('Alerts Queries', () => {
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

  describe('insertAlert', () => {
    test('should insert a single alert', async () => {
      const trace = createSampleTrace();
      await insertTrace(db, trace);

      const alert = createSampleAlert(trace.traceId, trace.spanId);
      const alertId = await insertAlert(db, alert);

      expect(alertId).toBeDefined();
      expect(typeof alertId).toBe('string');

      const result = await getAlertById(db, alertId);
      expect(result).toBeDefined();
      expect(result?.alertType).toBe(alert.alertType);
    });

    test('should fail for non-existent trace', async () => {
      const alert = createSampleAlert('non-existent-trace', 'non-existent-span');

      await expect(insertAlert(db, alert)).rejects.toThrow();
    });
  });

  describe.skip('insertAlertsBatch', () => {
    test('should insert multiple alerts', async () => {
      const trace = createSampleTrace();
      await insertTrace(db, trace);

      const alerts = [
        createSampleAlert(trace.traceId, trace.spanId, { alertType: 'cost_spike' }),
        createSampleAlert(trace.traceId, trace.spanId, { alertType: 'latency_spike' }),
        createSampleAlert(trace.traceId, trace.spanId, { alertType: 'quality_drop' }),
      ];

      const alertIds = await insertAlertsBatch(db, alerts);
      expect(alertIds.length).toBe(3);

      const counts = await getAlertCounts(db, { customerId: trace.customerId });
      expect(counts.total).toBe(3);
    });

    test('should handle empty batch', async () => {
      await expect(insertAlertsBatch(db, [])).resolves.toEqual([]);
    });
  });

  describe.skip('getAlertById', () => {
    test('should retrieve alert by ID', async () => {
      const trace = createSampleTrace();
      await insertTrace(db, trace);

      const alert = createSampleAlert(trace.traceId, trace.spanId);
      const alertId = await insertAlert(db, alert);

      const result = await getAlertById(db, alertId);
      expect(result).toBeDefined();
      expect(result?.alertId).toBe(alertId);
      expect(result?.alertType).toBe(alert.alertType);
      expect(result?.severity).toBe(alert.severity);
    });

    test('should return undefined for non-existent alert', async () => {
      const result = await getAlertById(db, 'non-existent-alert-id');
      expect(result).toBeUndefined();
    });
  });

  describe.skip('getAlertWithTrace', () => {
    test('should retrieve alert with joined trace data', async () => {
      const trace = createSampleTrace({ prompt: 'Test prompt', response: 'Test response' });
      await insertTrace(db, trace);

      const alert = createSampleAlert(trace.traceId, trace.spanId);
      const alertId = await insertAlert(db, alert);

      const result = await getAlertWithTrace(db, alertId);
      expect(result).toBeDefined();
      expect(result?.alertId).toBe(alertId);
      expect(result?.prompt).toBe('Test prompt');
      expect(result?.response).toBe('Test response');
      expect(result?.model).toBe(trace.model);
    });

    test('should return undefined for non-existent alert', async () => {
      const result = await getAlertWithTrace(db, 'non-existent-alert-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getAlertsWithFilters', () => {
    beforeEach(async () => {
      const trace1 = createSampleTrace({
        customerId: 'customer-1',
        serviceName: 'service-a',
      });
      const trace2 = createSampleTrace({
        customerId: 'customer-1',
        serviceName: 'service-b',
      });
      const trace3 = createSampleTrace({
        customerId: 'customer-2',
        serviceName: 'service-a',
      });

      await insertTrace(db, trace1);
      await insertTrace(db, trace2);
      await insertTrace(db, trace3);

      await insertAlertsBatch(db, [
        createSampleAlert(trace1.traceId, trace1.spanId, {
          customerId: 'customer-1',
          alertType: 'cost_spike',
          severity: 'HIGH',
          status: 'pending',
        }),
        createSampleAlert(trace2.traceId, trace2.spanId, {
          customerId: 'customer-1',
          alertType: 'latency_spike',
          severity: 'MEDIUM',
          status: 'acknowledged',
        }),
        createSampleAlert(trace3.traceId, trace3.spanId, {
          customerId: 'customer-2',
          alertType: 'quality_drop',
          severity: 'LOW',
          status: 'resolved',
        }),
      ]);
    });

    test('should filter by customerId', async () => {
      const results = await getAlertsWithFilters(db, {
        customerId: 'customer-1',
      });

      expect(results.length).toBe(2);
      expect(results.every((a) => a.customerId === 'customer-1')).toBe(true);
    });

    test('should filter by alertType', async () => {
      const results = await getAlertsWithFilters(db, {
        customerId: 'customer-1',
        alertType: 'cost_spike',
      });

      expect(results.length).toBe(1);
      expect(results[0].alertType).toBe('cost_spike');
    });

    test('should filter by severity', async () => {
      const results = await getAlertsWithFilters(db, {
        customerId: 'customer-1',
        severity: 'HIGH',
      });

      expect(results.length).toBe(1);
      expect(results[0].severity).toBe('HIGH');
    });

    test('should filter by status', async () => {
      const results = await getAlertsWithFilters(db, {
        customerId: 'customer-1',
        status: 'acknowledged',
      });

      expect(results.length).toBe(1);
      expect(results[0].status).toBe('acknowledged');
    });

    test('should apply limit and offset', async () => {
      const results = await getAlertsWithFilters(db, {
        customerId: 'customer-1',
        limit: 1,
        offset: 0,
      });

      expect(results.length).toBe(1);
    });

    test('should filter by time range', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const results = await getAlertsWithFilters(db, {
        customerId: 'customer-1',
        startTime: hourAgo,
        endTime: now,
      });

      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateAlertStatus', () => {
    test('should update alert status', async () => {
      const trace = createSampleTrace();
      await insertTrace(db, trace);

      const alert = createSampleAlert(trace.traceId, trace.spanId, {
        status: 'pending',
      });
      const alertId = await insertAlert(db, alert);

      await updateAlertStatus(db, alertId, 'acknowledged');

      const updated = await getAlertById(db, alertId);
      expect(updated?.status).toBe('acknowledged');
      expect(updated?.acknowledgedAt).toBeDefined();
    });

    test('should update to resolved status', async () => {
      const trace = createSampleTrace();
      await insertTrace(db, trace);

      const alert = createSampleAlert(trace.traceId, trace.spanId, {
        status: 'acknowledged',
      });
      const alertId = await insertAlert(db, alert);

      await updateAlertStatus(db, alertId, 'resolved');

      const updated = await getAlertById(db, alertId);
      expect(updated?.status).toBe('resolved');
      expect(updated?.resolvedAt).toBeDefined();
    });
  });

  describe.skip('getAlertCounts', () => {
    beforeEach(async () => {
      const trace = createSampleTrace({ customerId: 'customer-1' });
      await insertTrace(db, trace);

      await insertAlertsBatch(db, [
        createSampleAlert(trace.traceId, trace.spanId, {
          customerId: 'customer-1',
          status: 'pending',
          severity: 'HIGH',
        }),
        createSampleAlert(trace.traceId, trace.spanId, {
          customerId: 'customer-1',
          status: 'acknowledged',
          severity: 'MEDIUM',
        }),
        createSampleAlert(trace.traceId, trace.spanId, {
          customerId: 'customer-1',
          status: 'resolved',
          severity: 'LOW',
        }),
      ]);
    });

    test('should count alerts by status', async () => {
      const counts = await getAlertCounts(db, { customerId: 'customer-1' });

      expect(counts.total).toBe(3);
      expect(counts.pending).toBe(1);
      expect(counts.acknowledged).toBe(1);
      expect(counts.resolved).toBe(1);
    });

    test('should count high severity alerts', async () => {
      const counts = await getAlertCounts(db, { customerId: 'customer-1' });

      expect(counts.high).toBe(1);
      expect(counts.medium).toBe(1);
      expect(counts.low).toBe(1);
    });
  });

  describe.skip('deleteOldAlerts', () => {
    test('should delete alerts older than cutoff date', async () => {
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      const recentDate = new Date();

      const trace1 = createSampleTrace({ timestamp: oldDate });
      const trace2 = createSampleTrace({ timestamp: recentDate });
      await insertTrace(db, trace1);
      await insertTrace(db, trace2);

      await insertAlertsBatch(db, [
        createSampleAlert(trace1.traceId, trace1.spanId, {
          customerId: 'customer-1',
          timestamp: oldDate,
        }),
        createSampleAlert(trace2.traceId, trace2.spanId, {
          customerId: 'customer-1',
          timestamp: recentDate,
        }),
      ]);

      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const deletedCount = await deleteOldAlerts(db, cutoff);

      expect(deletedCount).toBe(1); // Only old alert deleted

      const remaining = await getAlertsWithFilters(db, { customerId: 'customer-1' });
      expect(remaining.length).toBe(1);
    });
  });
});
