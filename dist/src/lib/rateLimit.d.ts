export type RateLimitConfig = {
    limit: number;
    windowMs: number;
};
/**
 * Minimal in-memory rate limiter (token bucket) meant for single-node instances.
 */
export declare class InMemoryRateLimiter {
    private readonly nowFn;
    private buckets;
    constructor(nowFn?: () => number);
    consume(identifier: string, config: RateLimitConfig): {
        remaining: number;
        resetAt: number;
        limited: boolean;
    };
}
export declare const rateLimiter: InMemoryRateLimiter;
//# sourceMappingURL=rateLimit.d.ts.map