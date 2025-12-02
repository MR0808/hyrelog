# hyrelog-go

Official HyreLog Go SDK for ingesting and querying audit events.

## Installation

```bash
go get github.com/hyrelog/go-sdk
```

## Quick Start

### Workspace Client (Event Ingestion)

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/hyrelog/go-sdk"
)

func main() {
    client := hyrelog.NewWorkspaceClient(hyrelog.WorkspaceClientConfig{
        WorkspaceKey: "your-workspace-key",
        BaseURL:     "https://api.hyrelog.com",
        Debug:       true,
    })
    
    ctx := context.Background()
    
    // Log a single event
    event, err := client.LogEvent(ctx, hyrelog.EventInput{
        Action:   "user.created",
        Category: "auth",
        Actor: &hyrelog.Actor{
            ID:    "user-123",
            Email: "user@example.com",
            Name:  "John Doe",
        },
        Payload: map[string]interface{}{
            "userId": "user-123",
            "email":  "user@example.com",
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Event logged: %s\n", event.ID)
    
    // Log multiple events in a batch
    events := []hyrelog.EventInput{
        {Action: "user.created", Category: "auth"},
        {Action: "user.updated", Category: "auth"},
    }
    
    results, err := client.LogBatch(ctx, events)
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Logged %d events\n", len(results))
    
    // Query events
    results, err := client.QueryEvents(ctx, hyrelog.QueryOptions{
        Page:   1,
        Limit:  20,
        Action: "user.created",
    })
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Found %d events\n", results.Pagination.Total)
}
```

### Company Client (Read-Only)

```go
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/hyrelog/go-sdk"
)

func main() {
    client := hyrelog.NewCompanyClient(hyrelog.CompanyClientConfig{
        CompanyKey: "your-company-key",
    })
    
    ctx := context.Background()
    
    // Query events across all workspaces
    results, err := client.QueryEvents(ctx, hyrelog.QueryOptions{
        WorkspaceID: "workspace-123", // Optional: filter by workspace
        Page:        1,
        Limit:       20,
    })
    if err != nil {
        log.Fatal(err)
    }
    
    // Query events globally across all regions (Phase 3)
    globalResults, err := client.QueryGlobalEvents(ctx, hyrelog.QueryOptions{
        From:   "2024-01-01T00:00:00Z",
        Action: "user.created",
    })
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Found %d global events\n", globalResults.Pagination.Total)
}
```

## Features

- ✅ **Type-safe**: Full Go type definitions
- ✅ **Context support**: Standard `context.Context` for cancellation/timeouts
- ✅ **Automatic retries**: Built-in retry logic with exponential backoff
- ✅ **Rate limit handling**: Automatic backoff on 429 responses
- ✅ **Batching**: Queue events for efficient batch ingestion
- ✅ **OpenTelemetry**: Automatic span creation and trace propagation
- ✅ **Custom transport**: Override HTTP transport for advanced use cases
- ✅ **Debug mode**: Enable detailed logging for troubleshooting

## Configuration

### Retry Configuration

```go
client := hyrelog.NewWorkspaceClient(hyrelog.WorkspaceClientConfig{
    WorkspaceKey: "your-key",
    RetryConfig: &hyrelog.RetryConfig{
        MaxRetries:           5,
        InitialDelay:         time.Second,
        MaxDelay:             10 * time.Second,
        Multiplier:           2.0,
        RetryableStatusCodes: []int{429, 500, 502, 503, 504},
    },
})
```

### Batch Configuration

```go
client := hyrelog.NewWorkspaceClient(hyrelog.WorkspaceClientConfig{
    WorkspaceKey: "your-key",
    BatchConfig: &hyrelog.BatchConfig{
        MaxSize:   100,              // Maximum batch size
        MaxWait:   5 * time.Second,  // Maximum wait time before flushing
        AutoFlush: true,             // Automatically flush batches
    },
})

// Queue events (auto-flushed)
client.QueueEvent(ctx, hyrelog.EventInput{
    Action:   "user.created",
    Category: "auth",
})

// Manually flush
events, err := client.FlushBatch(ctx)
```

## Testing

Use the mock client for testing:

```go
import "github.com/hyrelog/go-sdk/testing"

workspace, company, store := testing.CreateMockClient()

// Use workspace/company clients as normal
event, _ := workspace.LogEvent(ctx, hyrelog.EventInput{
    Action:   "test",
    Category: "test",
})

// Access the mock store
events := store.Query(hyrelog.QueryOptions{})
```

## License

MIT

