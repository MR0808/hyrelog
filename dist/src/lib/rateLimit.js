/**
 * Minimal in-memory rate limiter (token bucket) meant for single-node instances.
 */
export class InMemoryRateLimiter {
    nowFn;
    buckets = new Map();
    constructor(nowFn = () => Date.now()) {
        this.nowFn = nowFn;
    }
    consume(identifier, config) {
        const now = this.nowFn();
        const bucket = this.buckets.get(identifier);
        if (!bucket || bucket.resetAt <= now) {
            const resetAt = now + config.windowMs;
            this.buckets.set(identifier, { count: 1, resetAt });
            return { remaining: config.limit - 1, resetAt, limited: false };
        }
        if (bucket.count >= config.limit) {
            return { remaining: 0, resetAt: bucket.resetAt, limited: true };
        }
        bucket.count += 1;
        return { remaining: config.limit - bucket.count, resetAt: bucket.resetAt, limited: false };
    }
}
export const rateLimiter = new InMemoryRateLimiter();
//# sourceMappingURL=rateLimit.js.map