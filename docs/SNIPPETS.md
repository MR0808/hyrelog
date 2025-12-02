# Code Snippets

## Node.js/TypeScript

```typescript
import { HyreLogWorkspaceClient } from "@hyrelog/node";

const client = new HyreLogWorkspaceClient({
  workspaceKey: "your-workspace-key",
});

await client.logEvent({
  action: "user.created",
  category: "auth",
  actor: { id: "user-123", email: "user@example.com" },
  payload: { userId: "user-123" },
});
```

## Python

```python
from hyrelog import HyreLogWorkspaceClient

client = HyreLogWorkspaceClient(
    workspace_key="your-workspace-key"
)

await client.log_event(
    EventInput(
        action="user.created",
        category="auth",
        actor=Actor(id="user-123", email="user@example.com"),
        payload={"userId": "user-123"},
    )
)
```

## Go

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
    },
})
```
