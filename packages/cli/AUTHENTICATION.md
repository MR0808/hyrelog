# Authentication in HyreLog CLI

## Overview

HyreLog uses **API key authentication**, not email/password. The `hyrelog login` command validates and stores your API key for CLI operations.

## How It Works

### 1. Get Your API Key

You need either:
- **Workspace API Key**: For workspace-specific operations (event ingestion, querying)
- **Company API Key**: For company-wide operations (managing keys, viewing all workspaces)

You can create API keys in your HyreLog dashboard or via the API.

### 2. Login with API Key

```bash
# Interactive login (prompts for API key)
hyrelog login

# Direct login with key
hyrelog login --key <your-api-key>

# Login with custom API URL (for local development)
hyrelog login --key <key> --url http://localhost:4040
```

### 3. What Happens During Login

1. The CLI validates your API key by making a test request to:
   - `/v1/key/workspace` (if workspace key)
   - `/v1/key/company` (if company key)

2. If valid, the key is stored in `~/.hyrelog/config.json`

3. The key type (workspace/company) is detected and displayed

### 4. Project-Specific Keys

For project-specific operations, use `hyrelog init` to create a `.hyrelogrc.json` file with workspace/company keys:

```bash
hyrelog init
# Prompts for workspace key and optional company key
```

This creates `.hyrelogrc.json`:
```json
{
  "workspaceKey": "your-workspace-key",
  "companyKey": "your-company-key",
  "baseUrl": "https://api.hyrelog.com"
}
```

## Authentication Flow

```
User runs: hyrelog login
    ↓
CLI prompts for API key (or uses --key flag)
    ↓
CLI validates key by calling API endpoints
    ↓
If valid: Save to ~/.hyrelog/config.json
If invalid: Show error message
```

## Why API Keys Instead of Email/Password?

HyreLog is designed as an API-first service:
- **Security**: API keys can be scoped and rotated easily
- **Simplicity**: No need for user accounts/passwords
- **CI/CD Friendly**: Keys can be stored as secrets
- **Service-to-Service**: Perfect for server-to-server communication

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** in CI/CD: `HYRELOG_WORKSPACE_KEY`
3. **Rotate keys regularly** using `hyrelog key rotate`
4. **Use workspace keys** for application code (scoped access)
5. **Use company keys** only for administrative operations

## Troubleshooting

### "Invalid API key" Error

- Verify the key is correct (no extra spaces)
- Check if the key has been revoked
- Ensure you're using the correct key type (workspace vs company)
- Verify the API URL is correct (check `--url` flag)

### "Authentication failed" Error

- Check your internet connection
- Verify the API endpoint is accessible
- Check if you're behind a firewall/proxy
- Try with `--url` flag to point to correct API instance

