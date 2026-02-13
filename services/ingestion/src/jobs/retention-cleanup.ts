/**
 * 7-Day Retention Cleanup Job
 *
 * Runs daily at 2:00 AM UTC to delete traces older than 7 days
 * for self-hosted deployments.
 */

import { getDatabase, deleteOldTraces, getTraceRetentionStats } from '../database/client';

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

    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const deletedCount = await deleteOldTraces(db, cutoffDate);

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
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const stats = await getTraceRetentionStats(db, cutoffDate);

    return {
      totalTraces: stats.totalTraces,
      tracesWithin7Days: stats.recentTraces,
      tracesOlderThan7Days: stats.oldTraces,
      oldestTraceDate: stats.oldestTimestamp,
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
