# Changes: Old/New Values & GDPR Export Processing

## 1. Old/New Values Support

### Schema Changes
- Added `changes` field to `AuditEvent` model (JSON, nullable)
- `changes` stores an array of `{field, old, new}` objects

### API Changes
- Updated `ingestEventSchema` to accept optional `changes` array
- Each change object has:
  - `field`: string (the field name that changed)
  - `old`: any (the previous value)
  - `new`: any (the new value)

### Example Usage

```json
POST /v1/key/workspace/events
{
  "action": "user.updated",
  "category": "user",
  "actor": {
    "id": "admin-123",
    "email": "admin@example.com"
  },
  "target": {
    "id": "user-456",
    "type": "user"
  },
  "changes": [
    {
      "field": "name",
      "old": "John Doe",
      "new": "Jane Doe"
    },
    {
      "field": "email",
      "old": "john@example.com",
      "new": "jane@example.com"
    }
  ],
  "payload": {
    "userId": "user-456"
  }
}
```

The `changes` array is stored in the event record and can be queried along with other event data.

## 2. GDPR Export Processing

### Schema Changes
- Added `Job` model for async job processing
- Added `JobType` enum: `GDPR_EXPORT`
- Added `JobStatus` enum: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`
- Jobs are linked to companies and track processing state

### API Changes

#### Create Export Job
```http
POST /v1/key/company/gdpr/export
```

Returns:
```json
{
  "jobId": "job-123",
  "status": "queued",
  "scope": "company",
  "companyId": "company-456",
  "message": "GDPR export queued for processing",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Check Job Status
```http
GET /v1/key/company/jobs/:jobId
```

Returns the full job object with current status, result, and error (if any).

### Worker Service

The export processing runs in a separate worker process:

```bash
npm run worker
```

The worker:
- Polls for pending `GDPR_EXPORT` jobs every 5 seconds
- Collects all company data (workspaces, projects, events, API keys, usage stats)
- Generates export data (currently returns metadata; in production would upload to S3/cloud storage)
- Updates job status to `COMPLETED` or `FAILED`

### Production Considerations

For production deployment:

1. **File Storage**: Upload exports to S3/cloud storage and store signed URLs in `job.result.downloadUrl`
2. **Worker Scaling**: Run multiple worker instances or use a proper job queue (Bull, BullMQ, etc.)
3. **Notifications**: Send email/webhook when export is ready
4. **Retention**: Auto-delete export files after 30 days
5. **Rate Limiting**: Limit concurrent exports per company

### Current Implementation

The current implementation:
- ✅ Creates jobs in database
- ✅ Worker processes jobs asynchronously
- ✅ Returns job status via API
- ⚠️ Export data is generated but not persisted to file storage (placeholder)
- ⚠️ Worker runs in same process (should be separate service in production)

### Migration Required

Run migration to add new tables:
```bash
npx prisma migrate dev --name add_changes_and_jobs
```

