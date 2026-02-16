/**
 * Baseline Update Job
 *
 * Periodically calculates and persists cost baselines (P50/P95/P99) for all
 * service+endpoint combinations to the cost_baselines table.
 *
 * Schedule:
 * - 1h window: Every hour
 * - 24h window: Every 6 hours
 * - 7d window: Every 6 hours
 */

import { eq, and, gte } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import { upsertBaseline, traces } from '@lumina/database';
import { calculateBaseline } from '@lumina/core';

interface ServiceEndpoint {
  serviceName: string;
  endpoint: string;
}

/**
 * Get all unique service+endpoint combinations from recent traces
 */
async function getUniqueEndpoints(
  customerId: string = 'default-customer',
  lookbackDays: number = 7
): Promise<ServiceEndpoint[]> {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  const endpoints = await db
    .selectDistinct({
      serviceName: traces.serviceName,
      endpoint: traces.endpoint,
    })
    .from(traces)
    .where(and(eq(traces.customerId, customerId), gte(traces.timestamp, cutoffDate)));

  return endpoints.map((e) => ({
    serviceName: e.serviceName || '',
    endpoint: e.endpoint || '',
  }));
}

/**
 * Get cost samples for baseline calculation
 */
async function getCostSamples(
  serviceName: string,
  endpoint: string,
  windowSize: '1h' | '24h' | '7d',
  customerId: string = 'default-customer'
): Promise<Array<{ costUsd: number; timestamp: Date }>> {
  const db = getDatabase();
  const now = new Date();
  const windowMs = getWindowMs(windowSize);
  const startTime = new Date(now.getTime() - windowMs);

  const samples = await db
    .select({
      costUsd: traces.costUsd,
      timestamp: traces.timestamp,
    })
    .from(traces)
    .where(
      and(
        eq(traces.customerId, customerId),
        eq(traces.serviceName, serviceName),
        eq(traces.endpoint, endpoint),
        gte(traces.timestamp, startTime),
        eq(traces.status, 'success') // Only successful traces for baseline
      )
    )
    .orderBy(traces.timestamp)
    .limit(10000); // Max 10k samples per window

  return samples.map((s) => ({
    costUsd: s.costUsd || 0,
    timestamp: s.timestamp,
  }));
}

/**
 * Convert window string to milliseconds
 */
function getWindowMs(window: '1h' | '24h' | '7d'): number {
  switch (window) {
    case '1h':
      return 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Update baselines for all endpoints and a specific window
 */
async function updateBaselinesForWindow(
  windowSize: '1h' | '24h' | '7d',
  customerId: string = 'default-customer'
): Promise<{ updated: number; skipped: number; errors: number }> {
  const db = getDatabase();
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`📊 Updating ${windowSize} baselines...`);

  try {
    // Get all unique service+endpoint combinations
    const endpoints = await getUniqueEndpoints(customerId);
    console.log(`   Found ${endpoints.length} unique endpoints`);

    for (const { serviceName, endpoint } of endpoints) {
      try {
        // Get cost samples for this endpoint and window
        const samples = await getCostSamples(serviceName, endpoint, windowSize, customerId);

        // Skip if not enough samples (need at least 10 for meaningful statistics)
        if (samples.length < 10) {
          skipped++;
          continue;
        }

        // Calculate baseline statistics
        const baseline = calculateBaseline(serviceName, endpoint, samples, windowSize);

        // Persist to database
        await upsertBaseline(db, {
          serviceName,
          endpoint,
          windowSize,
          p50Cost: baseline.p50Cost,
          p95Cost: baseline.p95Cost,
          p99Cost: baseline.p99Cost,
          sampleCount: baseline.sampleCount,
        });

        updated++;
      } catch (error) {
        console.error(
          `   ❌ Error updating baseline for ${serviceName}${endpoint} (${windowSize}):`,
          error instanceof Error ? error.message : error
        );
        errors++;
      }
    }

    console.log(
      `   ✅ ${windowSize} baselines updated: ${updated} updated, ${skipped} skipped (insufficient data), ${errors} errors`
    );
  } catch (error) {
    console.error(`❌ Failed to update ${windowSize} baselines:`, error);
    errors++;
  }

  return { updated, skipped, errors };
}

/**
 * Update all baselines (all windows)
 */
export async function updateAllBaselines(customerId: string = 'default-customer'): Promise<{
  success: boolean;
  total: { updated: number; skipped: number; errors: number };
  byWindow: Record<string, { updated: number; skipped: number; errors: number }>;
}> {
  console.log('🔄 Starting baseline update job...\n');
  const startTime = Date.now();

  const results = {
    '1h': { updated: 0, skipped: 0, errors: 0 },
    '24h': { updated: 0, skipped: 0, errors: 0 },
    '7d': { updated: 0, skipped: 0, errors: 0 },
  };

  try {
    // Update baselines for each window size
    results['1h'] = await updateBaselinesForWindow('1h', customerId);
    results['24h'] = await updateBaselinesForWindow('24h', customerId);
    results['7d'] = await updateBaselinesForWindow('7d', customerId);

    const totalUpdated = results['1h'].updated + results['24h'].updated + results['7d'].updated;
    const totalSkipped = results['1h'].skipped + results['24h'].skipped + results['7d'].skipped;
    const totalErrors = results['1h'].errors + results['24h'].errors + results['7d'].errors;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Baseline update completed in ${duration}s`);
    console.log(
      `   Total: ${totalUpdated} updated, ${totalSkipped} skipped, ${totalErrors} errors`
    );

    return {
      success: totalErrors === 0,
      total: {
        updated: totalUpdated,
        skipped: totalSkipped,
        errors: totalErrors,
      },
      byWindow: results,
    };
  } catch (error) {
    console.error('❌ Baseline update job failed:', error);
    return {
      success: false,
      total: { updated: 0, skipped: 0, errors: 1 },
      byWindow: results,
    };
  }
}

/**
 * Update only specific windows (for scheduled jobs)
 */
export async function updateBaselinesForWindows(
  windows: Array<'1h' | '24h' | '7d'>,
  customerId: string = 'default-customer'
): Promise<{ success: boolean; updated: number; skipped: number; errors: number }> {
  console.log(`🔄 Updating baselines for windows: ${windows.join(', ')}`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const window of windows) {
    const result = await updateBaselinesForWindow(window, customerId);
    totalUpdated += result.updated;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  return {
    success: totalErrors === 0,
    updated: totalUpdated,
    skipped: totalSkipped,
    errors: totalErrors,
  };
}

/**
 * Schedule baseline updates
 *
 * - 1h window: Every hour
 * - 24h and 7d windows: Every 6 hours
 */
export function scheduleBaselineUpdates() {
  console.log('📅 Scheduling baseline update jobs...');

  // Schedule 1h window updates every hour
  console.log('   - 1h baselines: every 1 hour');
  setInterval(
    () => {
      updateBaselinesForWindows(['1h']).catch((error) => {
        console.error('1h baseline update error:', error);
      });
    },
    60 * 60 * 1000 // 1 hour
  );

  // Schedule 24h and 7d window updates every 6 hours
  console.log('   - 24h & 7d baselines: every 6 hours');
  setInterval(
    () => {
      updateBaselinesForWindows(['24h', '7d']).catch((error) => {
        console.error('24h/7d baseline update error:', error);
      });
    },
    6 * 60 * 60 * 1000 // 6 hours
  );

  // Run initial update immediately
  console.log('   - Running initial baseline update...\n');
  setTimeout(() => {
    updateAllBaselines().catch((error) => {
      console.error('Initial baseline update error:', error);
    });
  }, 5000); // Wait 5 seconds for services to fully start

  console.log('✅ Baseline update jobs scheduled\n');
}
