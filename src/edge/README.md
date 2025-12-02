# Edge Ingestion Endpoints

Edge ingestion endpoints for deploying HyreLog event ingestion closer to users.

## Overview

These edge functions forward events to the primary HyreLog API while adding geo metadata and reducing latency.

## Supported Platforms

### 1. Cloudflare Workers

**File**: `src/edge/cloudflare-worker.ts`

**Deployment**:
```bash
# Install Wrangler CLI
npm install -g wrangler

# Deploy
wrangler publish src/edge/cloudflare-worker.ts
```

**Configuration** (wrangler.toml):
```toml
name = "hyrelog-edge-ingest"
main = "src/edge/cloudflare-worker.ts"

[env.production]
vars = { HYRELOG_API_URL = "https://api.hyrelog.com" }
```

**Usage**:
```typescript
// Events are automatically forwarded with geo metadata
await fetch("https://your-worker.workers.dev/ingest", {
  method: "POST",
  headers: {
    "x-hyrelog-key": "your-workspace-key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "user.created",
    category: "auth",
  }),
});
```

### 2. Vercel Edge Functions

**File**: `src/edge/vercel-edge.ts`

**Deployment**:
1. Create `api/ingest.ts` in your Vercel project
2. Copy the code from `src/edge/vercel-edge.ts`
3. Deploy to Vercel

**Configuration** (vercel.json):
```json
{
  "functions": {
    "api/ingest.ts": {
      "runtime": "@vercel/node"
    }
  },
  "env": {
    "HYRELOG_API_URL": "https://api.hyrelog.com"
  }
}
```

**Usage**:
```typescript
await fetch("https://your-app.vercel.app/api/ingest", {
  method: "POST",
  headers: {
    "x-hyrelog-key": "your-workspace-key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "user.created",
    category: "auth",
  }),
});
```

### 3. AWS Lambda@Edge

**File**: `src/edge/lambda-edge.ts`

**Deployment**:
1. Package the function:
```bash
npm install @types/aws-lambda
zip -r function.zip lambda-edge.ts node_modules/
```

2. Create Lambda function in AWS Console
3. Attach to CloudFront distribution (viewer-request or origin-request)

**Configuration**:
- Runtime: Node.js 18.x or later
- Handler: `lambda-edge.handler`
- Environment variables: `HYRELOG_API_URL=https://api.hyrelog.com`

**Usage**:
Events are automatically forwarded when requests hit your CloudFront distribution.

## Features

All edge functions provide:

- ✅ **Geo metadata**: Automatically adds country, city, region
- ✅ **Request forwarding**: Forwards to primary API
- ✅ **CORS support**: Handles preflight requests
- ✅ **Error handling**: Graceful error responses
- ✅ **API key validation**: Validates API keys before forwarding

## Geo Metadata

Events are enhanced with geo metadata:

```json
{
  "action": "user.created",
  "category": "auth",
  "metadata": {
    "_edge": {
      "provider": "cloudflare|vercel|aws-lambda-edge",
      "country": "US",
      "city": "San Francisco",
      "region": "CA"
    }
  }
}
```

## Best Practices

1. **Use edge endpoints for high-volume ingestion**: Reduces latency
2. **Monitor edge function performance**: Track execution time and errors
3. **Set up alerts**: Monitor for failures
4. **Use API keys**: Always require API keys for security
5. **Rate limiting**: Consider adding rate limiting at edge level

## Limitations

- Edge functions have execution time limits
- Lambda@Edge has size restrictions
- Some platforms have request size limits
- Geo metadata accuracy varies by platform

## License

MIT

