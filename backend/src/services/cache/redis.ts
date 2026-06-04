import Redis from 'ioredis';

// Redis connection URI
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize Redis client with resilient connection options
export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1, // Don't hang indefinitely
  retryStrategy(times) {
    // Only retry a few times before failing gracefully so the app continues
    if (times > 3) {
      console.warn('[REDIS] Max retries reached. Cache is unavailable.');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
  enableOfflineQueue: false, // Don't queue requests if Redis is down
});

redisClient.on('connect', () => console.log('[REDIS] Connected securely.'));
redisClient.on('error', (err) => console.error('[REDIS] Connection Error:', err.message));

/**
 * Normalizes a query for consistent cache keys
 */
export const normalizeQuery = (query: string): string => {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Robust wrapper to get cached data. Gracefully returns null on error.
 */
export const getCached = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    if (data) {
      console.log(`[CACHE HIT] Key: ${key}`);
      return JSON.parse(data) as T;
    }
    console.log(`[CACHE MISS] Key: ${key}`);
    return null;
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to get key ${key}:`, error);
    return null; // Graceful fallback
  }
};

/**
 * Robust wrapper to set cached data with a TTL. Gracefully fails on error.
 */
export const setCached = async (key: string, value: any, ttlSeconds: number): Promise<void> => {
  try {
    const data = JSON.stringify(value);
    await redisClient.setex(key, ttlSeconds, data);
    console.log(`[CACHE SET] Key: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to set key ${key}:`, error);
  }
};

/**
 * Delete a specific cache key
 */
export const delCached = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key);
    console.log(`[CACHE DEL] Key: ${key}`);
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to delete key ${key}:`, error);
  }
};

/**
 * Clear all cache completely
 */
export const clearCache = async (): Promise<void> => {
  try {
    await redisClient.flushdb();
    console.log(`[CACHE CLEARED] All keys flushed`);
  } catch (error) {
    console.error(`[CACHE ERROR] Failed to clear cache:`, error);
  }
};

export default redisClient;
