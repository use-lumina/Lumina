/**
 * 7-Day Retention Cleanup Job
 *
 * Runs daily at 2:00 AM UTC to delete traces older than 7 days
 * for self-hosted deployments.
 */

import { getDB } from '../database/postgres';

const RETENTION_DAYS = 7;

/**
 * Delete traces older than the retention period
 */
export async function cleanupOldTraces(): Promise<{
  deleted: number;
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`🗑️  Starting retention cleanup (${RETENTION_DAYS} days)...`);

    const db = getDB();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const sql = db.getClient();
    const result = await sql`
      DELETE FROM traces
      WHERE timestamp < ${cutoffDate.toISOString()}
      RETURNING trace_id
    `;

    const deletedCount = result.length;

    console.log(
      `✅ Retention cleanup completed: Deleted ${deletedCount} traces older than ${RETENTION_DAYS} days`
    );

    return {
      deleted: deletedCount,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Retention cleanup failed:', errorMessage);

    return {
      deleted: 0,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Schedule the cleanup job to run daily at 2:00 AM UTC
 */
export function scheduleRetentionCleanup() {
  // Calculate milliseconds until next 2:00 AM UTC
  const now = new Date();
  const next2AM = new Date();
  next2AM.setUTCHours(2, 0, 0, 0);

  // If it's already past 2 AM today, schedule for tomorrow
  if (now.getTime() > next2AM.getTime()) {
    next2AM.setUTCDate(next2AM.getUTCDate() + 1);
  }

  const msUntilNext = next2AM.getTime() - now.getTime();

  console.log(`📅 Scheduling retention cleanup for ${next2AM.toISOString()}`);

  // Schedule first run
  setTimeout(() => {
    cleanupOldTraces().catch((error) => {
      console.error('Retention cleanup error:', error);
    });

    // Schedule daily recurring runs (every 24 hours)
    setInterval(
      () => {
        cleanupOldTraces().catch((error) => {
          console.error('Retention cleanup error:', error);
        });
      },
      24 * 60 * 60 * 1000
    ); // 24 hours in milliseconds
  }, msUntilNext);
}

/**
 * Get retention statistics
 */
export async function getRetentionStats(): Promise<{
  totalTraces: number;
  tracesWithin7Days: number;
  tracesOlderThan7Days: number;
  oldestTraceDate: Date | null;
}> {
  try {
    const db = getDB();
    const sql = db.getClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // Get total traces
    const totalResult = await sql`SELECT COUNT(*) as count FROM traces`;
    const totalTraces = parseInt(totalResult[0].count, 10);

    // Get traces within retention period
    const recentResult = await sql`
      SELECT COUNT(*) as count
      FROM traces
      WHERE timestamp >= ${cutoffDate.toISOString()}
    `;
    const tracesWithin7Days = parseInt(recentResult[0].count, 10);

    // Get traces older than retention period
    const oldResult = await sql`
      SELECT COUNT(*) as count
      FROM traces
      WHERE timestamp < ${cutoffDate.toISOString()}
    `;
    const tracesOlderThan7Days = parseInt(oldResult[0].count, 10);

    // Get oldest trace date
    const oldestResult = await sql`
      SELECT MIN(timestamp) as oldest
      FROM traces
    `;
    const oldestTraceDate = oldestResult[0].oldest ? new Date(oldestResult[0].oldest) : null;

    return {
      totalTraces,
      tracesWithin7Days,
      tracesOlderThan7Days,
      oldestTraceDate,
    };
  } catch (error) {
    console.error('Failed to get retention stats:', error);
    return {
      totalTraces: 0,
      tracesWithin7Days: 0,
      tracesOlderThan7Days: 0,
      oldestTraceDate: null,
    };
  }
}
