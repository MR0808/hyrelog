# HyreLog API Reference

## Authentication

All API requests require an API key in the `x-hyrelog-key` header:

```
x-hyrelog-key: your-workspace-key
```

## Base URL

```
https://api.hyrelog.com
```

## Endpoints

### POST /v1/key/workspace/events

Log a single event

Ingest a single audit event


**Request Body:** `object`

**Responses:**
- `200`: Event logged successfully
- `400`: Invalid request
- `401`: Unauthorized
- `429`: Rate limit exceeded


### POST /v1/key/workspace/events/batch

Log multiple events

Ingest multiple events in a single request


**Request Body:** `object`

**Responses:**
- `200`: Events logged successfully


### GET /v1/key/workspace/events

Query events

Query events with filters and pagination

**Parameters:**
- `page` (number)
- `limit` (number)
- `action` (string)
- `category` (string)


**Responses:**
- `200`: Query results



## Rate Limits

- **Per API Key**: 1200 requests per minute
- **Per IP**: 600 requests per minute

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: ISO timestamp when limit resets
- `Retry-After`: Seconds to wait (on 429 responses)

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## SDKs

Use our official SDKs for easier integration:

- [Node.js/TypeScript SDK](../packages/node-sdk/README.md)
- [Python SDK](../packages/python-sdk/README.md)
- [Go SDK](../packages/go-sdk/README.md)
