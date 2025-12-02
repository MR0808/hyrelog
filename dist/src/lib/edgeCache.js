import crypto from "node:crypto";
/**
 * In-memory cache implementation.
 */
class MemoryCache {
    cache = new Map();
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlSeconds) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { value, expiresAt });
    }
    async delete(key) {
        this.cache.delete(key);
    }
    async deletePattern(pattern) {
        const regex = new RegExp(pattern.replace("*", ".*"));
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }
    async clear() {
        this.cache.clear();
    }
}
/**
 * Cache instance (defaults to memory).
 */
let cacheInstance = null;
/**
 * Gets the cache instance.
 */
function getCacheInstance() {
    if (!cacheInstance) {
        cacheInstance = new MemoryCache();
    }
    return cacheInstance;
}
/**
 * Generates a cache key for company events.
 */
export function getCompanyEventsCacheKey(companyId, filters) {
    const filterStr = JSON.stringify(filters);
    const hash = crypto.createHash("sha256").update(filterStr).digest("hex").slice(0, 8);
    return `company:${companyId}:events:${hash}`;
}
/**
 * Generates a cache key for workspace events.
 */
export function getWorkspaceEventsCacheKey(workspaceId, filters) {
    const filterStr = JSON.stringify(filters);
    const hash = crypto.createHash("sha256").update(filterStr).digest("hex").slice(0, 8);
    return `workspace:${workspaceId}:events:${hash}`;
}
/**
 * Generates a cache key for company info.
 */
export function getCompanyCacheKey(companyId) {
    return `company:${companyId}:info`;
}
/**
 * Generates a cache key for workspace info.
 */
export function getWorkspaceCacheKey(workspaceId) {
    return `workspace:${workspaceId}:info`;
}
/**
 * Gets a value from cache.
 */
export async function getCache(key) {
    return getCacheInstance().get(key);
}
/**
 * Sets a value in cache.
 */
export async function setCache(key, value, ttlSeconds = 300) {
    await getCacheInstance().set(key, value, ttlSeconds);
}
/**
 * Deletes a value from cache.
 */
export async function deleteCache(key) {
    await getCacheInstance().delete(key);
}
/**
 * Invalidates all cache entries for a company.
 */
export async function invalidateCompanyCache(companyId) {
    await getCacheInstance().deletePattern(`company:${companyId}:*`);
}
/**
 * Invalidates all cache entries for a workspace.
 */
export async function invalidateWorkspaceCache(workspaceId) {
    await getCacheInstance().deletePattern(`workspace:${workspaceId}:*`);
}
/**
 * Clears all cache.
 */
export async function clearCache() {
    await getCacheInstance().clear();
}
//# sourceMappingURL=edgeCache.js.map