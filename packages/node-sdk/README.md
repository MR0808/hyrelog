# @hyrelog/node

Official HyreLog Node.js/TypeScript SDK for ingesting and querying audit events.

## Installation

```bash
npm install @hyrelog/node
```

## Quick Start

### Workspace Client (Event Ingestion)

```typescript
import { HyreLogWorkspaceClient } from "@hyrelog/node";

const client = new HyreLogWorkspaceClient({
  workspaceKey: "your-workspace-key",
  baseUrl: "https://api.hyrelog.com", // Optional, defaults to production
  debug: true, // Enable debug logging
});

// Log a single event
const event = await client.logEvent({
  action: "user.created",
  category: "auth",
  actor: {
    id: "user-123",
    email: "user@example.com",
    name: "John Doe",
  },
  payload: {
    userId: "user-123",
    email: "user@example.com",
  },
});

// Log multiple events in a batch
const events = await client.logBatch([
  { action: "user.created", category: "auth", actor: { id: "user-1" } },
  { action: "user.updated", category: "auth", actor: { id: "user-2" } },
]);

// Query events
const results = await client.queryEvents({
  page: 1,
  limit: 20,
  from: "2024-01-01",
  to: "2024-01-31",
  action: "user.created",
});

// Cleanup (flush any pending batches)
await client.close();
```

### Company Client (Read-Only)

```typescript
import { HyreLogCompanyClient } from "@hyrelog/node";

const client = new HyreLogCompanyClient({
  companyKey: "your-company-key",
});

// Query events across all workspaces
const results = await client.queryEvents({
  workspaceId: "workspace-123", // Optional: filter by workspace
  page: 1,
  limit: 20,
});

// Query events globally across all regions (Phase 3)
const globalResults = await client.queryGlobalEvents({
  from: "2024-01-01",
  action: "user.created",
});

// Get region information
const regions = await client.getRegions();
```

## Features

- ✅ **Type-safe**: Full TypeScript support with generated types
- ✅ **Automatic retries**: Built-in retry logic with exponential backoff
- ✅ **Rate limit handling**: Automatic backoff on 429 responses
- ✅ **Batching**: Queue events for efficient batch ingestion
- ✅ **OpenTelemetry**: Automatic span creation and trace propagation
- ✅ **Custom transport**: Override HTTP transport for advanced use cases
- ✅ **Debug mode**: Enable detailed logging for troubleshooting

## Configuration

### Retry Configuration

```typescript
const client = new HyreLogWorkspaceClient({
  workspaceKey: "your-key",
  retry: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 10000,
    multiplier: 2,
    retryableStatusCodes: [429, 500, 502, 503, 504],
  },
});
```

### Batch Configuration

```typescript
const client = new HyreLogWorkspaceClient({
  workspaceKey: "your-key",
  batch: {
    maxSize: 100, // Maximum batch size
    maxWait: 5000, // Maximum wait time before flushing (ms)
    autoFlush: true, // Automatically flush batches
  },
});

// Queue events (auto-flushed)
client.queueEvent({ action: "user.created", category: "auth" });

// Manually flush
await client.flushBatch();
```

## Testing

Use the mock client for testing:

```typescript
import { createMockClient } from "@hyrelog/node";

const { workspace, company, store } = createMockClient();

// Use workspace/company clients as normal
await workspace.logEvent({ action: "test", category: "test" });

// Access the mock store
const events = store.query({});
```

## Framework Adapters

See `@hyrelog/node/adapters` for Express, Fastify, Koa, and Next.js middleware.

## License

MIT

