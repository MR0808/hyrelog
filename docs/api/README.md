# HyreLog Data API

HyreLog exposes a strict API-key–only surface area for ingesting and querying immutable audit events.

## Authentication

- Send the raw API key in the `x-hyrelog-key` header, or use the `Authorization: ApiKey <key>` header.
- Company keys are read-only and scoped to analytics APIs.
- Workspace keys are read/write and scoped to a single workspace.

## Endpoints

| Method | Path | Key Type | Description |
| --- | --- | --- | --- |
| GET | `/v1/key/company` | Company | Company profile + plan snapshot |
| GET | `/v1/key/company/workspaces` | Company | Paginated workspaces |
| GET | `/v1/key/company/workspaces/{workspaceId}` | Company | Workspace details and stats |
| GET | `/v1/key/company/events` | Company | Retention-aware event search |
| GET | `/v1/key/company/usage` | Company | Billing meter + usage |
| POST | `/v1/key/company/gdpr/export` | Company | Queue GDPR export job |
| GET | `/v1/key/company/jobs/{jobId}` | Company | Get job status |
| GET | `/v1/key/workspace` | Workspace | Workspace metadata + projects |
| GET | `/v1/key/workspace/events` | Workspace | Workspace/project events |
| POST | `/v1/key/workspace/events` | Workspace | Event ingestion with hash-chain |

All event listing endpoints return:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "retentionApplied": true,
    "retentionWindowStart": "2024-01-01T00:00:00.000Z"
  }
}
```

## Rate Limiting

- Per-IP: `RATE_LIMIT_PER_IP` requests per `RATE_LIMIT_WINDOW_SECONDS`.
- Per-Key: `RATE_LIMIT_PER_KEY` requests per the same window.

429 is returned when the limit is exceeded.

## Billing Enforcement

Workspace ingestion calls `/v1/key/workspace/events` increment the active billing meter. When the configured hard limit is reached the API returns either HTTP 429 or 402, depending on `BILLING_HARD_CAP_RESPONSE`.

## OpenAPI

The live specification is available at [`/openapi.json`](../../src/openapi/openapi.ts). Use it to generate SDKs or Markdown docs automatically.

