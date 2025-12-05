export type RateLimitConfig = {
    limit: number;
    windowMs: number;
    burstLimit?: number;
    refillRate?: number;
};
/**
 * Enhanced rate limiter with token bucket + leaky bucket hybrid.
 * Supports per-key and per-company limits.
 */
export declare class EnhancedRateLimiter {
    private readonly nowFn;
    private buckets;
    private keyLimits;
    private companyLimits;
    constructor(nowFn?: () => number);
    /**
     * Set custom rate limit for a specific API key
     */
    setKeyLimit(apiKeyId: string, config: RateLimitConfig): void;
    /**
     * Set custom rate limit for a company
     */
    setCompanyLimit(companyId: string, config: RateLimitConfig): void;
    /**
     * Consume from rate limit bucket (hybrid token bucket + leaky bucket)
     */
    consume(identifier: string, config: RateLimitConfig): {
        remaining: number;
        resetAt: number;
        limited: boolean;
        retryAfter?: number;
    };
    /**
     * Get rate limit status for an identifier
     */
    getStatus(identifier: string): {
        remaining: number;
        resetAt: number;
        limit: number;
        limited: boolean;
    } | null;
    /**
     * Clear rate limit for an identifier (useful for testing)
     */
    clear(identifier: string): void;
    /**
     * Clear all rate limits (useful for testing)
     */
    clearAll(): void;
}
export declare const rateLimiter: EnhancedRateLimiter;
//# sourceMappingURL=rateLimit.d.ts.map