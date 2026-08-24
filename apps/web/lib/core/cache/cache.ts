export interface CacheStats {
  hits: number;
  misses: number;
  lookups: number;
  evictions: number;
  size: number;
  avgLookupTimeMs: number;
}

export interface Cache<T> {
  get(hash: string): Promise<T | null>;
  put(hash: string, value: T): Promise<void>;
  invalidate(hash: string): Promise<void>;
  stats(): CacheStats;
}

export abstract class BaseCache<T> implements Cache<T> {
  protected map = new Map<string, { value: T; expiresAt?: number }>();
  protected hitsCount = 0;
  protected missesCount = 0;
  protected lookupsCount = 0;
  protected evictionsCount = 0;
  protected totalLookupTimeMs = 0;
  protected maxLimit: number;
  protected defaultTtlMs: number;

  constructor(maxLimit = 1000, defaultTtlMs = 3600000) {
    this.maxLimit = maxLimit;
    this.defaultTtlMs = defaultTtlMs;
  }

  async get(hash: string): Promise<T | null> {
    const start = Date.now();
    this.lookupsCount++;

    const item = this.map.get(hash);
    if (!item) {
      this.missesCount++;
      this.totalLookupTimeMs += Date.now() - start;
      return null;
    }

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.map.delete(hash);
      this.evictionsCount++;
      this.missesCount++;
      this.totalLookupTimeMs += Date.now() - start;
      return null;
    }

    this.hitsCount++;
    this.totalLookupTimeMs += Date.now() - start;
    return item.value;
  }

  async put(hash: string, value: T, ttlMs?: number): Promise<void> {
    if (this.map.size >= this.maxLimit) {
      // LRU/FIFO eviction: remove first item
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
        this.evictionsCount++;
      }
    }

    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.map.set(hash, { value, expiresAt });
  }

  async invalidate(hash: string): Promise<void> {
    if (this.map.has(hash)) {
      this.map.delete(hash);
      this.evictionsCount++;
    }
  }

  stats(): CacheStats {
    const avgLookupTimeMs = this.lookupsCount > 0 ? this.totalLookupTimeMs / this.lookupsCount : 0;
    return {
      hits: this.hitsCount,
      misses: this.missesCount,
      lookups: this.lookupsCount,
      evictions: this.evictionsCount,
      size: this.map.size,
      avgLookupTimeMs,
    };
  }
}
