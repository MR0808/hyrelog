# hyrelog-python

Official HyreLog Python SDK for ingesting and querying audit events.

## Installation

```bash
pip install hyrelog-python
```

Or with Poetry:

```bash
poetry add hyrelog-python
```

## Quick Start

### Workspace Client (Event Ingestion)

```python
from hyrelog import HyreLogWorkspaceClient

client = HyreLogWorkspaceClient(
    workspace_key="your-workspace-key",
    base_url="https://api.hyrelog.com",  # Optional, defaults to production
    debug=True,  # Enable debug logging
)

# Log a single event
event = await client.log_event(
    action="user.created",
    category="auth",
    actor={
        "id": "user-123",
        "email": "user@example.com",
        "name": "John Doe",
    },
    payload={
        "userId": "user-123",
        "email": "user@example.com",
    },
)

# Log multiple events in a batch
events = await client.log_batch([
    {"action": "user.created", "category": "auth", "actor": {"id": "user-1"}},
    {"action": "user.updated", "category": "auth", "actor": {"id": "user-2"}},
])

# Query events
results = await client.query_events(
    page=1,
    limit=20,
    from_date="2024-01-01",
    to_date="2024-01-31",
    action="user.created",
)
```

### Company Client (Read-Only)

```python
from hyrelog import HyreLogCompanyClient

client = HyreLogCompanyClient(
    company_key="your-company-key",
)

# Query events across all workspaces
results = await client.query_events(
    workspace_id="workspace-123",  # Optional: filter by workspace
    page=1,
    limit=20,
)

# Query events globally across all regions (Phase 3)
global_results = await client.query_global_events(
    from_date="2024-01-01",
    action="user.created",
)

# Get region information
regions = await client.get_regions()
```

## Features

- ✅ **Type-safe**: Full Pydantic model support
- ✅ **Async/await**: Built on httpx for async operations
- ✅ **Automatic retries**: Built-in retry logic with exponential backoff
- ✅ **Rate limit handling**: Automatic backoff on 429 responses
- ✅ **Batching**: Queue events for efficient batch ingestion
- ✅ **OpenTelemetry**: Automatic span creation and trace propagation
- ✅ **Custom transport**: Override HTTP transport for advanced use cases
- ✅ **Debug mode**: Enable detailed logging for troubleshooting

## Configuration

### Retry Configuration

```python
client = HyreLogWorkspaceClient(
    workspace_key="your-key",
    retry_config={
        "max_retries": 5,
        "initial_delay": 1.0,
        "max_delay": 10.0,
        "multiplier": 2.0,
        "retryable_status_codes": [429, 500, 502, 503, 504],
    },
)
```

### Batch Configuration

```python
client = HyreLogWorkspaceClient(
    workspace_key="your-key",
    batch_config={
        "max_size": 100,  # Maximum batch size
        "max_wait": 5.0,  # Maximum wait time before flushing (seconds)
        "auto_flush": True,  # Automatically flush batches
    },
)

# Queue events (auto-flushed)
await client.queue_event({"action": "user.created", "category": "auth"})

# Manually flush
await client.flush_batch()
```

## Testing

Use the mock client for testing:

```python
from hyrelog.testing import create_mock_client

workspace, company, store = create_mock_client()

# Use workspace/company clients as normal
await workspace.log_event({"action": "test", "category": "test"})

# Access the mock store
events = store.query({})
```

## License

MIT

