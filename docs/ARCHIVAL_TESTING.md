# Testing S3 Archival

## Prerequisites

1. ✅ S3 bucket created and configured (see [S3_SETUP_GUIDE.md](./S3_SETUP_GUIDE.md))
2. ✅ Company has `RETENTION_S3_ARCHIVE` add-on assigned
3. ✅ Environment variables set (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`)

## Quick Test Steps

### Step 1: Prepare Test Events

Run the test script to create old events ready for archival:

```bash
tsx scripts/test-archival.ts
```

This script:
- Finds a company with S3 archival add-on
- Creates 10 events older than the retention window
- Marks them as `archivalCandidate = true`

**Expected output:**
```
🧪 Preparing events for archival testing...

✅ Found company: Acme Corp (acme-corp)
   Retention days: 365
   Workspaces: 2

📅 Creating events older than retention window...
   Cutoff date: 2023-12-01T00:00:00.000Z

✅ Created 10 old events

🏷️  Marking events as archival candidates...
✅ Marked 10 events as archival candidates

📊 Summary:
   Company: Acme Corp
   Workspace: Core App
   Events ready for archival: 10
   Retention window: 365 days
   Cutoff date: 2023-12-01T00:00:00.000Z

🚀 Next steps:
   1. Run archival job: tsx src/crons/archivalJob.ts
   2. Check S3 bucket for archived files
   3. Verify events are marked as archived=true in database
```

### Step 2: Run Archival Job

```bash
tsx src/crons/archivalJob.ts
```

**Expected output:**
```
Archived 10 events for company clxxx...
```

### Step 3: Verify in S3

**Option A: Use Verification Script (Recommended)**
```bash
npx tsx scripts/verify-s3-archives.ts
```

This will show you exactly which files are in S3 and their paths.

**Option B: AWS Console**

1. Go to AWS S3 Console: https://s3.console.aws.amazon.com
2. Click on your bucket (`hyrelog-archives-prod` or your bucket name)
3. **Important**: Navigate into the nested folder structure:
   ```
   {companyId}/          ← Click here first (e.g., cminremf40005f8f5v4lfne2l)
     └── {workspaceId}/  ← Then click here (e.g., cminremz2000af8f5nuyozdcz)
         ├── 2024-11-21.json.gz
         ├── 2024-11-22.json.gz
         └── ...
   ```

**Option C: AWS CLI**
```bash
aws s3 ls s3://hyrelog-archives-prod/ --recursive
```

**Expected file structure:**
```
{companyId}/{workspaceId}/{YYYY-MM-DD}.json.gz
```

**Note**: Files are nested 2 levels deep. You must navigate into the company folder, then the workspace folder to see the date files!

### Step 4: Verify in Database

```sql
-- Check archived events
SELECT COUNT(*) FROM "AuditEvent" WHERE archived = true;

-- Check events still in DB but marked archived
SELECT id, "createdAt", archived FROM "AuditEvent" 
WHERE archived = true 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

### Step 5: Test Archive Export Endpoint

Use Postman or curl:

```bash
curl -H "x-hyrelog-key: YOUR_COMPANY_KEY" \
  "http://localhost:4040/v1/key/company/export-archive.json?from=2023-12-01&to=2023-12-10" \
  > archive-export.json
```

## Manual Testing (Without Script)

If you prefer to test manually:

### 1. Create Old Events via API

```bash
# Use workspace key to create events
curl -X POST \
  -H "x-hyrelog-key: YOUR_WORKSPACE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test.archival",
    "category": "test",
    "payload": {"test": true}
  }' \
  http://localhost:4040/v1/key/workspace/events
```

**Then manually update the event to be old:**

```sql
-- Make event older than retention window
UPDATE "AuditEvent" 
SET "createdAt" = NOW() - INTERVAL '400 days',
    "archivalCandidate" = true
WHERE action = 'test.archival'
LIMIT 1;
```

### 2. Run Retention Marking Job

```bash
tsx src/crons/retentionMarking.ts
```

This marks events outside retention window as `archivalCandidate = true`.

### 3. Run Archival Job

```bash
tsx src/crons/archivalJob.ts
```

## Troubleshooting

### No Events Archived

**Check:**
1. Company has S3 add-on:
   ```sql
   SELECT c.name, ca."addOnId" 
   FROM "Company" c
   JOIN "CompanyAddOn" ca ON c.id = ca."companyId"
   JOIN "AddOn" a ON ca."addOnId" = a.id
   WHERE a.code = 'RETENTION_S3_ARCHIVE';
   ```

2. Events are marked as candidates:
   ```sql
   SELECT COUNT(*) FROM "AuditEvent" 
   WHERE "archivalCandidate" = true AND archived = false;
   ```

3. Events are old enough:
   ```sql
   SELECT COUNT(*) FROM "AuditEvent" 
   WHERE "createdAt" < NOW() - INTERVAL '366 days'
   AND "archivalCandidate" = true;
   ```

4. S3 credentials are correct:
   ```bash
   node test-s3.js
   ```

### Events Archived but Not in S3

**Check:**
1. S3 bucket name is correct in `.env`
2. IAM user has `s3:PutObject` permission
3. Check S3 bucket logs/CloudTrail for errors
4. Verify file path format: `{companyId}/{workspaceId}/{YYYY-MM-DD}.json.gz`

### Archive Export Returns Empty

**Check:**
1. Events are actually archived (`archived = true`)
2. Date range includes archived dates
3. Workspace ID filter is correct (if used)
4. S3 files exist for the date range

## Expected Behavior

### Archival Process

1. **Retention Marking** (daily cron):
   - Finds events older than retention window
   - Sets `archivalCandidate = true`

2. **Archival Job** (nightly cron):
   - Finds events with `archivalCandidate = true` AND older than retention
   - Groups by workspace and date
   - Compresses to JSON.gz
   - Uploads to S3: `{companyId}/{workspaceId}/{YYYY-MM-DD}.json.gz`
   - Sets `archived = true` in database

3. **Query Behavior**:
   - Regular queries (`GET /v1/key/workspace/events`) only return `archived = false` events
   - Archive export (`GET /v1/key/company/export-archive.json`) streams from S3

### File Structure in S3

```
hyrelog-archives-prod/
├── {companyId1}/
│   ├── {workspaceId1}/
│   │   ├── 2023-12-01.json.gz
│   │   ├── 2023-12-02.json.gz
│   │   └── ...
│   └── {workspaceId2}/
│       └── ...
└── {companyId2}/
    └── ...
```

## Postman Collection

The Postman collection has been updated with:
- ✅ `GET /v1/key/company/export.json` - JSON export
- ✅ `GET /v1/key/company/export.csv` - CSV export
- ✅ `GET /v1/key/company/export-archive.json` - Archive export
- ✅ `GET /v1/key/workspace/export.json` - Workspace JSON export
- ✅ `GET /v1/key/workspace/export.csv` - Workspace CSV export
- ✅ `GET /v1/key/workspace/events/tail` - SSE tailing

Import the updated collection to test all endpoints!

