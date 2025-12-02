# Event Schema Registry

The Event Schema Registry allows you to define and validate event schemas for your workspace.

## Overview

Schemas ensure consistency and enable validation of events before ingestion. Each schema defines:
- Event type (e.g., `user.created`)
- JSON Schema for validation
- Version number
- Active/inactive status

## Creating Schemas

### Via API

```bash
curl -X POST https://api.hyrelog.com/v1/key/workspace/{workspaceId}/schemas \
  -H "x-hyrelog-key: your-workspace-key" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "user.created",
    "description": "Schema for user creation events",
    "jsonSchema": {
      "type": "object",
      "properties": {
        "userId": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "name": { "type": "string" }
      },
      "required": ["userId", "email"]
    },
    "version": 1,
    "isActive": true
  }'
```

### Via CLI

```bash
# Push schema from file
hyrelog schema push schema.json

# Pull schemas
hyrelog schema pull
```

## Schema Format

Schemas use JSON Schema format:

```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "string",
      "description": "Unique user identifier"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "metadata": {
      "type": "object",
      "additionalProperties": true
    }
  },
  "required": ["userId", "email"]
}
```

## Versioning

Schemas support versioning:

```bash
# Create version 2 of a schema
curl -X POST .../schemas \
  -d '{
    "eventType": "user.created",
    "version": 2,
    "jsonSchema": { ... }
  }'
```

## Validation

When schema validation is enabled for a workspace, events are automatically validated against their schemas during ingestion.

Invalid events return a `400 Bad Request` with validation errors.

## Best Practices

1. **Start simple**: Begin with basic schemas and refine over time
2. **Use versioning**: Create new versions instead of modifying existing ones
3. **Document schemas**: Include descriptions for clarity
4. **Test schemas**: Use the CLI to test before deploying
5. **Monitor validation**: Track validation failures in your monitoring

## API Endpoints

- `POST /v1/key/workspace/{workspaceId}/schemas` - Create schema
- `GET /v1/key/workspace/{workspaceId}/schemas` - List schemas
- `GET /v1/key/workspace/{workspaceId}/schemas/{schemaId}` - Get schema
- `PUT /v1/key/workspace/{workspaceId}/schemas/{schemaId}` - Update schema
- `DELETE /v1/key/workspace/{workspaceId}/schemas/{schemaId}` - Delete schema

## Examples

See [examples](../examples/) for schema usage in different frameworks.

