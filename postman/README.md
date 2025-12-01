# HyreLog API - Postman Collection

This directory contains Postman environment and collection files for testing the HyreLog Data API.

## API Keys (from seed)

These keys were generated during the initial database seed:

### Company Key (Read-Only)
```
hlk_25ac813b9132ed658d20ffd2cf8ae610a0f2348c76c4d4bd
```
- **Type**: Company (read-only)
- **Access**: Company-wide analytics, usage stats, event queries (retention-limited)
- **Endpoints**: All `/v1/key/company/*` routes

### Workspace 1 Key (Read/Write)
```
hlk_d1a07125034bbec95703e35b99c64d7bbcff069d0aae16b8
```
- **Type**: Workspace (read/write)
- **Workspace**: `core-app`
- **Access**: Event ingestion and workspace-level queries
- **Endpoints**: All `/v1/key/workspace/*` routes

### Workspace 2 Key (Read/Write)
```
hlk_a1172bdeb53688003035d0bded3229c9e221c5a849c6cafa
```
- **Type**: Workspace (read/write)
- **Workspace**: `data-platform`
- **Access**: Event ingestion and workspace-level queries
- **Endpoints**: All `/v1/key/workspace/*` routes

## Setup Instructions

1. **Import into Postman**:
   - Open Postman
   - Click **Import** button
   - Select both files:
     - `HyreLog.postman_environment.json`
     - `HyreLog.postman_collection.json`

2. **Select Environment**:
   - In Postman, select the **"HyreLog API"** environment from the dropdown
   - Ensure the server is running (`npm run dev`)

3. **Update Base URL** (if needed):
   - The default is `http://localhost:4040`
   - Edit the environment variable `base_url` if your server runs on a different port

4. **Get Workspace/Project IDs**:
   - Run **"Get Workspace Info"** to get workspace IDs
   - Run **"List Workspaces"** (company key) to see all workspaces
   - Update the `workspace_id` and `project_id` environment variables for requests that need them

## Collection Structure

### Health Check
- `GET /healthz` - Basic health check (no auth required)

### Company Key Endpoints
- `GET /v1/key/company` - Get company info and plan details
- `GET /v1/key/company/workspaces` - List all workspaces (paginated)
- `GET /v1/key/company/workspaces/:workspaceId` - Get workspace details with stats
- `GET /v1/key/company/events` - Query events across all workspaces (with filters)
- `GET /v1/key/company/usage` - Get usage stats and billing meter info
- `POST /v1/key/company/gdpr/export` - GDPR export request (stub)
- `POST /v1/key/company/gdpr/delete` - GDPR delete request (stub)

### Workspace Key Endpoints
- `GET /v1/key/workspace` - Get workspace info and projects
- `GET /v1/key/workspace/events` - Query events for this workspace (with filters)
- `POST /v1/key/workspace/events` - Ingest a new audit event

### OpenAPI
- `GET /openapi.json` - Get OpenAPI 3.1 schema

## Authentication

All API key endpoints require the `x-hyrelog-key` header:

```
x-hyrelog-key: hlk_...
```

Alternatively, you can use the `Authorization` header:

```
Authorization: ApiKey hlk_...
```

## Example Requests

### Ingest Event (Minimal)
```json
POST /v1/key/workspace/events
{
  "action": "user.login",
  "category": "auth",
  "payload": {
    "ip": "192.168.1.1"
  }
}
```

### Ingest Event (Full)
```json
POST /v1/key/workspace/events
{
  "action": "invoice.created",
  "category": "billing",
  "actor": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "target": {
    "id": "invoice-456",
    "type": "invoice"
  },
  "projectId": "project-id-here",
  "payload": {
    "amount": 99.99,
    "currency": "USD"
  },
  "metadata": {
    "source": "api"
  }
}
```

### Query Events with Filters
```
GET /v1/key/company/events?page=1&limit=20&action=user.login&category=auth&from=2024-01-01T00:00:00Z
```

## Rate Limiting

- **Per API Key**: 1200 requests per 60 seconds (default)
- **Per IP**: 600 requests per 60 seconds (default)

Rate limit headers are included in responses:
- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`

## Notes

- All event queries are subject to retention limits (default: 90 days)
- Company keys are read-only and cannot ingest events
- Workspace keys can both read and write events
- Events are never deleted; retention only affects query visibility
- Hash chain ensures event immutability

