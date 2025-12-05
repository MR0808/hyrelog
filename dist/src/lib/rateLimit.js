/**
 * Enhanced rate limiter with token bucket + leaky bucket hybrid.
 * Supports per-key and per-company limits.
 */
export class EnhancedRateLimiter {
    nowFn;
    buckets = new Map();
    keyLimits = new Map(); // Per-key custom limits
    companyLimits = new Map(); // Per-company limits
    constructor(nowFn = () => Date.now()) {
        this.nowFn = nowFn;
    }
    /**
     * Set custom rate limit for a specific API key
     */
    setKeyLimit(apiKeyId, config) {
        this.keyLimits.set(apiKeyId, config);
    }
    /**
     * Set custom rate limit for a company
     */
    setCompanyLimit(companyId, config) {
        this.companyLimits.set(companyId, config);
    }
    /**
     * Consume from rate limit bucket (hybrid token bucket + leaky bucket)
     */
    consume(identifier, config) {
        const now = this.nowFn();
        const bucket = this.buckets.get(identifier);
        // Use token bucket if refillRate is specified, otherwise use leaky bucket
        const useTokenBucket = config.refillRate !== undefined && config.refillRate > 0;
        if (!bucket || bucket.resetAt <= now) {
            // Initialize new bucket
            const resetAt = now + config.windowMs;
            const tokens = useTokenBucket ? (config.burstLimit || config.limit) : config.limit;
            this.buckets.set(identifier, {
                count: 1,
                resetAt,
                tokens: tokens - 1,
                lastRefill: now,
            });
            return {
                remaining: tokens - 1,
                resetAt,
                limited: false,
            };
        }
        // Refill tokens if using token bucket
        if (useTokenBucket && config.refillRate) {
            const timeSinceRefill = (now - bucket.lastRefill) / 1000; // Convert to seconds
            const tokensToAdd = Math.floor(timeSinceRefill * config.refillRate);
            if (tokensToAdd > 0) {
                bucket.tokens = Math.min(bucket.tokens + tokensToAdd, config.burstLimit || config.limit);
                bucket.lastRefill = now;
            }
        }
        // Check limits
        if (useTokenBucket) {
            // Token bucket: check available tokens
            if (bucket.tokens <= 0) {
                const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
                return {
                    remaining: 0,
                    resetAt: bucket.resetAt,
                    limited: true,
                    retryAfter,
                };
            }
            bucket.tokens -= 1;
            bucket.count += 1;
            return {
                remaining: Math.floor(bucket.tokens),
                resetAt: bucket.resetAt,
                limited: false,
            };
        }
        else {
            // Leaky bucket: check count
            if (bucket.count >= config.limit) {
                const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
                return {
                    remaining: 0,
                    resetAt: bucket.resetAt,
                    limited: true,
                    retryAfter,
                };
            }
            bucket.count += 1;
            return {
                remaining: config.limit - bucket.count,
                resetAt: bucket.resetAt,
                limited: false,
            };
        }
    }
    /**
     * Get rate limit status for an identifier
     */
    getStatus(identifier) {
        const bucket = this.buckets.get(identifier);
        if (!bucket) {
            return null;
        }
        const now = this.nowFn();
        if (bucket.resetAt <= now) {
            return null; // Bucket expired
        }
        return {
            remaining: bucket.tokens >= 0 ? Math.floor(bucket.tokens) : bucket.count,
            resetAt: bucket.resetAt,
            limit: bucket.count + (bucket.tokens >= 0 ? Math.floor(bucket.tokens) : 0),
            limited: bucket.tokens <= 0 || bucket.count >= (bucket.tokens >= 0 ? bucket.tokens : bucket.count),
        };
    }
    /**
     * Clear rate limit for an identifier (useful for testing)
     */
    clear(identifier) {
        this.buckets.delete(identifier);
    }
    /**
     * Clear all rate limits (useful for testing)
     */
    clearAll() {
        this.buckets.clear();
    }
}
export const rateLimiter = new EnhancedRateLimiter();
//# sourceMappingURL=rateLimit.js.map