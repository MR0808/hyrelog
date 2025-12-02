import crypto from "node:crypto";

/**
 * Cache provider types.
 */
export type CacheProvider = "memory" | "redis" | "upstash" | "cloudflare";

/**
 * In-memory cache implementation.
 */
class MemoryCache {
  private cache = new Map<string, { value: any; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace("*", ".*"));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Cache instance (defaults to memory).
 */
let cacheInstance: MemoryCache | null = null;

/**
 * Gets the cache instance.
 */
function getCacheInstance(): MemoryCache {
  if (!cacheInstance) {
    cacheInstance = new MemoryCache();
  }
  return cacheInstance;
}

/**
 * Generates a cache key for company events.
 */
export function getCompanyEventsCacheKey(
  companyId: string,
  filters: Record<string, any>,
): string {
  const filterStr = JSON.stringify(filters);
  const hash = crypto.createHash("sha256").update(filterStr).digest("hex").slice(0, 8);
  return `company:${companyId}:events:${hash}`;
}

/**
 * Generates a cache key for workspace events.
 */
export function getWorkspaceEventsCacheKey(
  workspaceId: string,
  filters: Record<string, any>,
): string {
  const filterStr = JSON.stringify(filters);
  const hash = crypto.createHash("sha256").update(filterStr).digest("hex").slice(0, 8);
  return `workspace:${workspaceId}:events:${hash}`;
}

/**
 * Generates a cache key for company info.
 */
export function getCompanyCacheKey(companyId: string): string {
  return `company:${companyId}:info`;
}

/**
 * Generates a cache key for workspace info.
 */
export function getWorkspaceCacheKey(workspaceId: string): string {
  return `workspace:${workspaceId}:info`;
}

/**
 * Gets a value from cache.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  return getCacheInstance().get<T>(key);
}

/**
 * Sets a value in cache.
 */
export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
  await getCacheInstance().set(key, value, ttlSeconds);
}

/**
 * Deletes a value from cache.
 */
export async function deleteCache(key: string): Promise<void> {
  await getCacheInstance().delete(key);
}

/**
 * Invalidates all cache entries for a company.
 */
export async function invalidateCompanyCache(companyId: string): Promise<void> {
  await getCacheInstance().deletePattern(`company:${companyId}:*`);
}

/**
 * Invalidates all cache entries for a workspace.
 */
export async function invalidateWorkspaceCache(workspaceId: string): Promise<void> {
  await getCacheInstance().deletePattern(`workspace:${workspaceId}:*`);
}

/**
 * Clears all cache.
 */
export async function clearCache(): Promise<void> {
  await getCacheInstance().clear();
}

