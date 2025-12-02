# Getting Started with HyreLog

Welcome to HyreLog! This guide will help you get started with logging audit events.

## Quick Start

### 1. Create an Account

Sign up at [hyrelog.com](https://hyrelog.com) and create your first workspace.

### 2. Get Your API Key

1. Navigate to your workspace settings
2. Go to "API Keys"
3. Create a new workspace key
4. Copy the key (you'll only see it once!)

### 3. Install an SDK

Choose your language:

**Node.js/TypeScript:**
```bash
npm install @hyrelog/node
```

**Python:**
```bash
pip install hyrelog-python
```

**Go:**
```bash
go get github.com/hyrelog/go-sdk
```

### 4. Log Your First Event

**Node.js:**
```typescript
import { HyreLogWorkspaceClient } from "@hyrelog/node";

const client = new HyreLogWorkspaceClient({
  workspaceKey: "your-workspace-key",
});

await client.logEvent({
  action: "user.created",
  category: "auth",
  actor: {
    id: "user-123",
    email: "user@example.com",
  },
  payload: {
    userId: "user-123",
    name: "John Doe",
  },
});
```

**Python:**
```python
from hyrelog import HyreLogWorkspaceClient, EventInput

client = HyreLogWorkspaceClient(
    workspace_key="your-workspace-key"
)

await client.log_event(
    EventInput(
        action="user.created",
        category="auth",
        actor=Actor(id="user-123", email="user@example.com"),
        payload={"userId": "user-123", "name": "John Doe"},
    )
)
```

**Go:**
```go
import "github.com/hyrelog/go-sdk"

client := hyrelog.NewWorkspaceClient(hyrelog.WorkspaceClientConfig{
    WorkspaceKey: "your-workspace-key",
})

event, err := client.LogEvent(ctx, hyrelog.EventInput{
    Action:   "user.created",
    Category: "auth",
    Actor: &hyrelog.Actor{
        ID:    "user-123",
        Email: "user@example.com",
    },
    Payload: map[string]interface{}{
        "userId": "user-123",
        "name":   "John Doe",
    },
})
```

## Next Steps

### Query Events

```typescript
const results = await client.queryEvents({
  page: 1,
  limit: 20,
  action: "user.created",
  from: "2024-01-01T00:00:00Z",
  to: "2024-01-31T23:59:59Z",
});
```

### Use Framework Adapters

**Express.js:**
```typescript
import { hyrelogMiddleware } from "@hyrelog/node/adapters";

app.use(hyrelogMiddleware({
  workspaceKey: "your-key",
}));
```

**Next.js:**
```typescript
// middleware.ts
import { hyrelogNextMiddleware } from "@hyrelog/node/adapters";

export default hyrelogNextMiddleware({
  workspaceKey: process.env.HYRELOG_WORKSPACE_KEY!,
});
```

### Set Up Schema Registry

```bash
# Push a schema
hyrelog schema push schema.json

# Pull schemas
hyrelog schema pull
```

### Local Development

```bash
# Start local dev simulator
hyrelog dev

# Events will be logged locally with TUI viewer
```

## Resources

- [API Reference](./API.md)
- [SDK Documentation](./SDKs.md)
- [Code Snippets](./SNIPPETS.md)
- [Examples](../examples/)

## Support

- Documentation: [docs.hyrelog.com](https://docs.hyrelog.com)
- Support: support@hyrelog.com
- GitHub: [github.com/hyrelog](https://github.com/hyrelog)

