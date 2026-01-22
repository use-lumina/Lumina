/**
 * Rate Limiting Middleware for Self-Hosted Deployments
 *
 * Enforces a 50k traces per day limit for self-hosted instances.
 */

import { Context, Next } from 'hono';
import { getCache } from '@lumina/core';

const DAILY_TRACE_LIMIT = 50000;
const RATE_LIMIT_KEY_PREFIX = 'rate_limit:daily:';

/**
 * Get the current date string for rate limiting key
 * Format: YYYY-MM-DD
 */
function getDailyKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Middleware to enforce daily trace limits
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  try {
    const cache = getCache();

    if (!cache) {
      // No Redis cache available - allow request but log warning
      console.warn('Rate limiting disabled: Redis cache not available');
      return await next();
    }

    // Get or initialize daily counter
    const dailyKey = `${RATE_LIMIT_KEY_PREFIX}${getDailyKey()}`;
    const currentCount = await cache.get(dailyKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    // Check if limit exceeded
    if (count >= DAILY_TRACE_LIMIT) {
      return c.json(
        {
          error: 'Rate limit exceeded',
          message: `Self-hosted deployment has reached the daily limit of ${DAILY_TRACE_LIMIT} traces. Limit resets at midnight UTC.`,
          limit: DAILY_TRACE_LIMIT,
          current: count,
          resetTime: getNextResetTime(),
        },
        429
      );
    }

    // Store key for incrementing after successful ingestion
    c.set('rateLimitKey', dailyKey);
    c.set('currentTraceCount', count);

    return await next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request through but log the issue
    return await next();
  }
}

/**
 * Increment the daily trace counter after successful ingestion
 */
export async function incrementTraceCount(dailyKey: string, traceCount: number) {
  try {
    const cache = getCache();

    if (!cache) {
      return;
    }

    const currentCount = await cache.get(dailyKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;
    const newCount = count + traceCount;

    // Set with 25-hour TTL to handle timezone edge cases
    const ttl = 25 * 60 * 60; // 25 hours in seconds
    await cache.set(dailyKey, newCount.toString(), ttl);

    // Log when approaching limit
    if (newCount >= DAILY_TRACE_LIMIT * 0.9) {
      console.warn(
        `⚠️  Approaching daily trace limit: ${newCount}/${DAILY_TRACE_LIMIT} (${Math.round((newCount / DAILY_TRACE_LIMIT) * 100)}%)`
      );
    }
  } catch (error) {
    console.error('Failed to increment trace count:', error);
    // Don't throw - this is non-critical
  }
}

/**
 * Get the next reset time (midnight UTC)
 */
function getNextResetTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Get current usage statistics
 */
export async function getRateLimitStats(): Promise<{
  limit: number;
  current: number;
  remaining: number;
  resetTime: string;
}> {
  const cache = getCache();

  if (!cache) {
    return {
      limit: DAILY_TRACE_LIMIT,
      current: 0,
      remaining: DAILY_TRACE_LIMIT,
      resetTime: getNextResetTime(),
    };
  }

  const dailyKey = `${RATE_LIMIT_KEY_PREFIX}${getDailyKey()}`;
  const currentCount = await cache.get(dailyKey);
  const current = currentCount ? parseInt(currentCount, 10) : 0;

  return {
    limit: DAILY_TRACE_LIMIT,
    current,
    remaining: Math.max(0, DAILY_TRACE_LIMIT - current),
    resetTime: getNextResetTime(),
  };
}
