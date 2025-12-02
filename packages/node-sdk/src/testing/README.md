# HyreLog Testing Utilities

Comprehensive testing utilities for HyreLog SDK.

## Installation

```bash
npm install --save-dev @hyrelog/node
```

## Quick Start

### Using Mock Client

```typescript
import { createMockClient } from "@hyrelog/node/testing";

const { workspace, company, store } = createMockClient();

// Use clients as normal - they work in-memory
await workspace.logEvent({
  action: "user.created",
  category: "auth",
  actor: { id: "user-1", email: "user@example.com" },
});

// Query events
const results = await workspace.queryEvents();
console.log(results.data); // Array of events

// Access the store directly
console.log(store.count()); // Number of events
store.clear(); // Clear all events
```

### Using Event Factories

```typescript
import { eventFactories } from "@hyrelog/node/testing";

// Pre-configured factories
const userCreated = eventFactories.user.created({
  actor: { id: "user-123", email: "user@example.com" },
  payload: { name: "John Doe" },
});

// Generate batches
import { generateEventBatch } from "@hyrelog/node/testing";
const events = generateEventBatch(10); // 10 test events
```

### Jest Integration

```typescript
import { setupHyreLogTests } from "@hyrelog/node/testing/jest";

const { workspace, store, factories } = setupHyreLogTests();

describe("My tests", () => {
  it("should log events", async () => {
    const event = factories.user.created();
    await workspace.logEvent(event);
    expect(store.count()).toBe(1);
  });
});
```

### Vitest Integration

```typescript
import { setupHyreLogTests } from "@hyrelog/node/testing/vitest";

const { workspace, store, factories } = setupHyreLogTests();

describe("My tests", () => {
  it("should log events", async () => {
    const event = factories.user.created();
    await workspace.logEvent(event);
    expect(store.count()).toBe(1);
  });
});
```

## API Reference

### `createMockClient(workspaceKey?, companyKey?)`

Creates mock workspace and company clients with an in-memory store.

### `eventFactories`

Pre-configured event factories:
- `eventFactories.user.created()`
- `eventFactories.user.updated()`
- `eventFactories.api.request()`
- `eventFactories.billing.subscriptionCreated()`
- `eventFactories.system.pipelineError()`

### `generateEventBatch(count, factory?)`

Generates a batch of test events.

### `createEventFactory(defaults?)`

Creates a custom event factory with defaults.

### `assertEventStructure(event)`

Asserts that an event has the required structure.

### `assertQueryResponse(response)`

Asserts that a query response is valid.

### `toDiffableJSON(obj)`

Creates a diffable JSON string for testing.

## Examples

### Testing Event Ingestion

```typescript
import { createMockClient, eventFactories } from "@hyrelog/node/testing";

const { workspace, store } = createMockClient();

test("ingests events", async () => {
  const event = eventFactories.user.created();
  await workspace.logEvent(event);
  
  expect(store.count()).toBe(1);
  const stored = store.getById(store.events[0].id);
  expect(stored?.action).toBe("user.created");
});
```

### Testing Batch Operations

```typescript
import { createMockClient, generateEventBatch } from "@hyrelog/node/testing";

const { workspace, store } = createMockClient();

test("batches events", async () => {
  const events = generateEventBatch(5);
  await workspace.logBatch(events);
  
  expect(store.count()).toBe(5);
});
```

### Testing Queries

```typescript
import { createMockClient, eventFactories } from "@hyrelog/node/testing";

const { workspace } = createMockClient();

test("queries events", async () => {
  await workspace.logEvent(eventFactories.user.created({ actor: { id: "user-1" } }));
  await workspace.logEvent(eventFactories.user.created({ actor: { id: "user-2" } }));
  
  const results = await workspace.queryEvents({
    actorId: "user-1",
  });
  
  expect(results.data.length).toBe(1);
  expect(results.data[0].actor?.id).toBe("user-1");
});
```

### Snapshot Testing

```typescript
import { createMockClient, createEventSnapshot } from "@hyrelog/node/testing";

const { workspace, store } = createMockClient();

test("event snapshot", async () => {
  await workspace.logEvent(eventFactories.user.created());
  const snapshot = createEventSnapshot(store.events);
  expect(snapshot).toMatchSnapshot();
});
```

## License

MIT

