/**
 * Redis-based cache with TTL support
 * For semantic score caching to reduce API costs
 */

import Redis from 'ioredis';

let redis: Redis | null = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
export function initializeCache(redisUrl?: string): void {
  if (redis) return;

  const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on('connect', () => {
      isConnected = true;
      console.log('✓ Redis cache connected');
    });

    redis.on('error', (err) => {
      console.error('Redis cache error:', err.message);
      isConnected = false;
    });

    // Connect immediately
    redis.connect().catch((err) => {
      console.warn('Redis cache connection failed, will operate without cache:', err.message);
    });
  } catch (error) {
    console.warn('Failed to initialize Redis cache:', error);
    redis = null;
  }
}

/**
 * Get value from cache
 */
export async function getCache(key: string): Promise<any | null> {
  if (!redis || !isConnected) {
    return null; // Graceful degradation
  }

  try {
    const value = await redis.get(key);
    if (!value) return null;

    return JSON.parse(value);
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  if (!redis || !isConnected) {
    return; // Graceful degradation
  }

  try {
    const serialized = JSON.stringify(value);
    await redis.setex(key, ttlSeconds, serialized);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Clear specific key from cache
 */
export async function clearCacheKey(key: string): Promise<void> {
  if (!redis || !isConnected) {
    return;
  }

  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  if (!redis || !isConnected) {
    return;
  }

  try {
    await redis.flushdb();
  } catch (error) {
    console.error('Cache flush error:', error);
  }
}

/**
 * Close Redis connection
 */
export async function closeCache(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    isConnected = false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{ hitRate: number; keys: number } | null> {
  if (!redis || !isConnected) {
    return null;
  }

  try {
    const info = await redis.info('stats');
    const dbsize = await redis.dbsize();

    // Parse hit rate from info
    const hits = info.match(/keyspace_hits:(\d+)/)?.[1] || '0';
    const misses = info.match(/keyspace_misses:(\d+)/)?.[1] || '0';
    const totalRequests = parseInt(hits) + parseInt(misses);
    const hitRate = totalRequests > 0 ? parseInt(hits) / totalRequests : 0;

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      keys: dbsize,
    };
  } catch (error) {
    console.error('Cache stats error:', error);
    return null;
  }
}
