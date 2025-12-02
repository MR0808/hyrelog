# Phase 4: Observability & OpenTelemetry Enhancements

## Overview

Comprehensive observability improvements with OpenTelemetry spans, structured logging, and enhanced metrics.

## Features

### 1. OpenTelemetry Integration

Full OpenTelemetry SDK integration with:
- Automatic instrumentation for Fastify, HTTP, and Prisma
- Custom spans for critical operations
- Trace propagation across services
- OTLP exporter support

### 2. Span Coverage

Spans are created for:
- **Event Ingestion**: `hyrelog.ingest_event`
  - Company ID, workspace ID, event action/category
  - Region routing
  - Database writes
  - Replication queuing

- **Authentication**: `hyrelog.auth.api_key`
  - API key validation
  - IP allowlist checks
  - Key expiration/revocation checks
  - Success/failure events

- **Region Routing**: `hyrelog.region.route`
  - Region selection
  - Cross-region queries

- **GDPR Operations**: `hyrelog.gdpr.process`
  - Request processing
  - Anonymization/deletion

- **Replication**: `hyrelog.replication.sync`
  - Cross-region replication
  - Job processing

- **Archival**: `hyrelog.archive.process`
  - Cold storage operations
  - S3/Glacier uploads

### 3. Structured Logging

All logs include:
- Trace ID for correlation
- Span context
- Structured JSON format
- Error stack traces
- Request metadata

### 4. Metrics

Enhanced metrics exposed at `/internal/metrics`:
- Request rates (per endpoint, per key)
- Error rates
- Latency percentiles (p50, p95, p99)
- Rate limit hits
- Database query performance
- Region health

### 5. Error Instrumentation

All errors are:
- Recorded in spans with full context
- Logged with stack traces
- Tagged with error types
- Included in metrics

## Configuration

### Environment Variables

```env
# OpenTelemetry
OTEL_SERVICE_NAME=hyrelog-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # Optional
```

### Span Attributes

Standard attributes used:
- `hyrelog.company_id`: Company identifier
- `hyrelog.workspace_id`: Workspace identifier
- `hyrelog.event.action`: Event action
- `hyrelog.event.category`: Event category
- `hyrelog.region`: Data region
- `hyrelog.api_key.id`: API key identifier
- `hyrelog.trace_id`: Trace identifier

## Usage Examples

### Creating Custom Spans

```typescript
import { createAsyncSpan, setSpanAttributes, addSpanEvent } from "@/lib/otel";

await createAsyncSpan("custom.operation", async (span) => {
  setSpanAttributes({
    "custom.param": value,
  });

  // Do work
  const result = await doSomething();

  addSpanEvent("custom.milestone", { "custom.value": result });

  return result;
});
```

### Recording Exceptions

```typescript
import { recordSpanException } from "@/lib/otel";

try {
  await riskyOperation();
} catch (error) {
  recordSpanException(error, {
    "error.type": "operation_failed",
    "error.context": "additional_info",
  });
  throw error;
}
```

### Getting Trace ID

```typescript
import { getTraceId } from "@/lib/otel";

const traceId = getTraceId();
// Use in logs, error reports, etc.
```

## SDK Integration

SDKs automatically create spans:
- Event ingestion spans
- Query spans
- Retry spans
- Rate limit spans

Trace context is propagated via:
- HTTP headers (`traceparent`, `tracestate`)
- Event metadata (`traceId` field)

## Best Practices

1. **Always wrap async operations** in `createAsyncSpan`
2. **Set relevant attributes** for filtering/searching
3. **Record exceptions** with context
4. **Use consistent naming** for spans (`service.operation`)
5. **Keep spans focused** - one operation per span
6. **Propagate trace context** across service boundaries

## Monitoring

### Viewing Traces

Traces can be viewed in:
- Jaeger (if configured)
- Grafana Tempo
- Datadog APM
- New Relic
- Any OTLP-compatible backend

### Key Metrics to Monitor

- **Ingestion latency**: p95, p99
- **Error rates**: per endpoint, per key
- **Rate limit hits**: frequency and patterns
- **Database performance**: query times
- **Region health**: availability and latency

## Migration Notes

- Existing code continues to work
- Spans are created automatically via instrumentation
- Custom spans are opt-in
- No breaking changes

