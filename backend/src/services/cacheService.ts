// FENCO 2.0 — Cache Service
// Uses Redis (ioredis) with transparent in-memory fallback.
// Falls back to in-memory Map if Redis is unavailable.

import { Redis } from 'ioredis';
import { getEnv } from '../config/env';
import { truncateForLog } from '../utils/index';

const DEFAULT_TTL_SECONDS = 86400; // 24 hours

class InMemoryCache {
  private store = new Map<string, { value: string; expiresAt: number }>();
  
  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
  
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class CacheService {
  private redis: Redis | null = null;
  private inMemory: InMemoryCache;
  private redisAvailable = false;
  
  constructor() {
    this.inMemory = new InMemoryCache();
    this.initRedis();
  }
  
  private initRedis(): void {
    try {
      const env = getEnv();
      this.redis = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // don't retry — fall back to memory
      });
      
      this.redis.on('connect', () => {
        this.redisAvailable = true;
        console.log('✅ Redis connected');
      });
      
      this.redis.on('error', (err) => {
        if (this.redisAvailable) {
          console.warn(`⚠️  Redis error, falling back to in-memory cache: ${truncateForLog(err.message)}`);
        }
        this.redisAvailable = false;
      });
      
      this.redis.connect().catch(() => {
        console.warn('⚠️  Redis unavailable, using in-memory cache fallback');
      });
    } catch {
      console.warn('⚠️  Redis init failed, using in-memory cache fallback');
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = this.redisAvailable && this.redis
        ? await this.redis.get(key)
        : await this.inMemory.get(key);
      
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    const serialized = JSON.stringify(value);
    try {
      if (this.redisAvailable && this.redis) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.inMemory.set(key, serialized, ttlSeconds);
      }
    } catch {
      // Silent fallback to in-memory
      await this.inMemory.set(key, serialized, ttlSeconds);
    }
  }
  
  async del(key: string): Promise<void> {
    try {
      if (this.redisAvailable && this.redis) {
        await this.redis.del(key);
      } else {
        await this.inMemory.del(key);
      }
    } catch { /* ignore */ }
  }
  
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => { /* ignore */ });
    }
  }
}

// Singleton
let cacheInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

export default getCacheService;
