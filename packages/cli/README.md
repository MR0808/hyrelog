# @hyrelog/cli

HyreLog CLI tool for development and management.

## Installation

```bash
npm install -g @hyrelog/cli
```

Or use with npx:

```bash
npx @hyrelog/cli
```

## Commands

### Authentication

```bash
# Login with your API key (workspace or company key)
hyrelog login

# Login with API key directly
hyrelog login --key <your-api-key>

# Login with custom API URL (REQUIRED for local development)
hyrelog login --key <key> --url http://localhost:4040
```

**Note**:

-   HyreLog uses API key authentication. The `login` command validates and stores your API key for CLI operations.
-   **For local development**: You MUST use `--url http://localhost:4040` (or whatever port your server runs on)
-   Make sure your HyreLog server is running before logging in
-   You can get API keys from the seed output or create them via the API

### Project Setup

```bash
# Initialize a new project
hyrelog init

# Initialize with keys
hyrelog init --workspace-key <key> --company-key <key>
```

### Development

```bash
# Start local development simulator
hyrelog dev

# Start on custom port
hyrelog dev --port 8080

# Disable TUI
hyrelog dev --no-ui
```

### Event Tailing

```bash
# Tail events in real-time
hyrelog tail

# Tail specific workspace
hyrelog tail --workspace-id <id>

# JSON output format
hyrelog tail --format json
```

### Testing

```bash
# Send test events
hyrelog test

# Send specific number of events
hyrelog test --count 50
```

### Export

```bash
# Export events to JSON
hyrelog export

# Export to CSV
hyrelog export --format csv --output events.csv

# Export with filters
hyrelog export --from 2024-01-01 --to 2024-01-31 --action user.created
```

### Schema Registry

```bash
# Pull schemas from workspace
hyrelog schema pull

# Pull to specific directory
hyrelog schema pull --output ./schemas

# Push schema to workspace
hyrelog schema push schema.json
```

### API Key Management

```bash
# Create a new API key
hyrelog key create --type workspace --name "My Key"

# Rotate an API key
hyrelog key rotate <key-id>

# Revoke an API key
hyrelog key revoke <key-id>
```

## Configuration

The CLI uses `.hyrelogrc.json` in your project root:

```json
{
    "workspaceKey": "your-workspace-key",
    "companyKey": "your-company-key",
    "baseUrl": "https://api.hyrelog.com"
}
```

Global configuration is stored in `~/.hyrelog/config.json`.

## License

MIT
