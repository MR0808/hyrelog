# Phase 4: Rate Limit Enhancements

## Overview

Enhanced rate limiting system with token bucket + leaky bucket hybrid, per-key limits, and Retry-After headers.

## Features

### 1. Hybrid Rate Limiting

- **Token Bucket**: When `RATE_LIMIT_REFILL_RATE` is configured
  - Allows bursts up to `burstLimit`
  - Refills tokens at a constant rate
  - Better for handling traffic spikes

- **Leaky Bucket**: Default mode (when refill rate not set)
  - Simple sliding window
  - Fixed limit per window
  - Predictable behavior

### 2. Per-Key Rate Limits

Each API key can have custom rate limits:

```typescript
import { rateLimiter } from "@/lib/rateLimit";

// Set custom limit for a specific API key
rateLimiter.setKeyLimit(apiKeyId, {
  limit: 5000, // 5000 requests
  windowMs: 60000, // per minute
  burstLimit: 10000, // Allow bursts up to 10k
  refillRate: 100, // Refill 100 tokens per second
});
```

### 3. Per-Company Burst Limits

Set company-wide burst limits:

```typescript
rateLimiter.setCompanyLimit(companyId, {
  limit: 10000,
  windowMs: 60000,
  burstLimit: 20000,
});
```

### 4. Rate Limit Headers

All responses include rate limit headers:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when limit resets
- `Retry-After`: Seconds to wait (only on 429 responses)

### 5. Rate Limit Status Endpoints

Check current rate limit status:

```bash
# Workspace key
GET /v1/key/workspace/rate-limit
Headers: x-hyrelog-key: <workspace-key>

# Company key
GET /v1/key/company/rate-limit
Headers: x-hyrelog-key: <company-key>
```

Response:
```json
{
  "limit": 1200,
  "remaining": 850,
  "resetAt": "2024-01-01T12:01:00Z",
  "windowSeconds": 60,
  "limited": false
}
```

## Configuration

### Environment Variables

```env
# Default rate limits
RATE_LIMIT_PER_KEY=1200          # Requests per window per API key
RATE_LIMIT_PER_IP=600            # Requests per window per IP
RATE_LIMIT_WINDOW_SECONDS=60     # Window size in seconds

# Token bucket configuration (optional)
RATE_LIMIT_BURST_MULTIPLIER=2.0  # Burst limit = limit * multiplier
RATE_LIMIT_REFILL_RATE=100       # Tokens per second (enables token bucket)
```

### Programmatic Configuration

```typescript
import { rateLimiter } from "@/lib/rateLimit";

// Set per-key limit
rateLimiter.setKeyLimit("api-key-id", {
  limit: 5000,
  windowMs: 60000,
  burstLimit: 10000,
  refillRate: 100,
});

// Set per-company limit
rateLimiter.setCompanyLimit("company-id", {
  limit: 10000,
  windowMs: 60000,
});
```

## Usage Examples

### SDK Automatic Handling

The SDKs automatically handle `Retry-After` headers:

```typescript
// Node SDK
const client = new HyreLogWorkspaceClient({
  workspaceKey: "your-key",
  retry: {
    retryableStatusCodes: [429], // Retry on rate limit
  },
});

// SDK will automatically wait for Retry-After seconds
await client.logEvent({ ... });
```

### Manual Retry Handling

```typescript
try {
  await client.logEvent({ ... });
} catch (error) {
  if (error.status === 429) {
    const retryAfter = error.headers["retry-after"];
    await sleep(parseInt(retryAfter) * 1000);
    // Retry...
  }
}
```

## Testing

### Check Rate Limit Status

```bash
curl -H "x-hyrelog-key: <your-key>" \
  http://localhost:4040/v1/key/workspace/rate-limit
```

### Simulate Rate Limiting

```typescript
// Set a very low limit for testing
rateLimiter.setKeyLimit("test-key-id", {
  limit: 5,
  windowMs: 60000,
});

// Make 6 requests - 6th will be rate limited
```

## Implementation Details

### Token Bucket Algorithm

1. Each identifier has a bucket with:
   - `tokens`: Available tokens (starts at `burstLimit`)
   - `lastRefill`: Last time tokens were refilled
   - `resetAt`: When the window resets

2. On each request:
   - Refill tokens based on elapsed time: `tokens += (now - lastRefill) * refillRate`
   - Cap tokens at `burstLimit`
   - If tokens > 0: consume 1 token, allow request
   - If tokens <= 0: reject with 429 and `Retry-After` header

### Leaky Bucket Algorithm

1. Each identifier has a bucket with:
   - `count`: Number of requests in current window
   - `resetAt`: When the window resets

2. On each request:
   - If window expired: reset bucket
   - If count < limit: increment count, allow request
   - If count >= limit: reject with 429

## Best Practices

1. **Set appropriate limits**: Balance between preventing abuse and allowing legitimate traffic
2. **Use token bucket for bursty traffic**: Better for handling traffic spikes
3. **Monitor rate limit headers**: Track usage patterns
4. **Implement exponential backoff**: In SDKs and clients
5. **Set per-key limits**: For enterprise customers with higher needs

## Migration Notes

The enhanced rate limiter is backward compatible:
- Existing code continues to work
- New features are opt-in via configuration
- Default behavior unchanged (leaky bucket)

