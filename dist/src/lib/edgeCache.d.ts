/**
 * Cache provider types.
 */
export type CacheProvider = "memory" | "redis" | "upstash" | "cloudflare";
/**
 * Generates a cache key for company events.
 */
export declare function getCompanyEventsCacheKey(companyId: string, filters: Record<string, any>): string;
/**
 * Generates a cache key for workspace events.
 */
export declare function getWorkspaceEventsCacheKey(workspaceId: string, filters: Record<string, any>): string;
/**
 * Generates a cache key for company info.
 */
export declare function getCompanyCacheKey(companyId: string): string;
/**
 * Generates a cache key for workspace info.
 */
export declare function getWorkspaceCacheKey(workspaceId: string): string;
/**
 * Gets a value from cache.
 */
export declare function getCache<T>(key: string): Promise<T | null>;
/**
 * Sets a value in cache.
 */
export declare function setCache(key: string, value: any, ttlSeconds?: number): Promise<void>;
/**
 * Deletes a value from cache.
 */
export declare function deleteCache(key: string): Promise<void>;
/**
 * Invalidates all cache entries for a company.
 */
export declare function invalidateCompanyCache(companyId: string): Promise<void>;
/**
 * Invalidates all cache entries for a workspace.
 */
export declare function invalidateWorkspaceCache(workspaceId: string): Promise<void>;
/**
 * Clears all cache.
 */
export declare function clearCache(): Promise<void>;
//# sourceMappingURL=edgeCache.d.ts.map