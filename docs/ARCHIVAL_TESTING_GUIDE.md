# Archival Testing Guide - Step-by-Step

This guide walks you through testing the complete archival workflow from seeding data to exporting archived events.

## Prerequisites

1. **Server Running**: Make sure the server is running (`npm run dev`)
2. **S3 Configured**: Ensure S3 credentials are set in `.env`:
    ```
    AWS_REGION=us-east-1
    AWS_ACCESS_KEY_ID=your_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_key
    AWS_S3_BUCKET=your_bucket_name
    ```
3. **Postman Installed**: Import the Postman collection and environment

---

## Option A: Start Fresh (Recommended for First Time)

If you want to start completely fresh:

### Step 0: Clean Up S3 (Optional)

If you have existing archived files and want to start clean:

**Option 1: Using AWS Console (Recommended)**

1. Go to AWS S3 Console
2. Navigate to your bucket (`hyrelog-archives-prod`)
3. Select all files (or specific folders)
4. Click "Delete"

**Option 2: Using AWS CLI**

```bash
aws s3 rm s3://your-bucket-name/ --recursive
```

**Option 3: Using Cleanup Script**

```bash
npx tsx scripts/cleanup-s3.ts
```

**⚠️ Note**: The cleanup script may fail with permission errors if your IAM user only has `PutObject`/`GetObject` permissions (which is correct for security). In that case, use Option 1 or 2 with admin credentials.

### Step 0: Reset Database

```bash
npm run seed
```

This will:

-   ✅ Clear all existing data
-   ✅ Create fresh test data
-   ✅ Create 30 events ready for archival (400-450 days old)
-   ✅ Create 20 already archived events

**Important**: Save the API keys printed at the end!

---

## Option B: Test with Existing Data

If you already have data and archived files, you can test with those:

1. **Verify S3 Connection**:

    ```bash
    npx tsx test-archival-debug.ts
    ```

    This will show you:

    - S3 connection status
    - Events ready for archival
    - Current database state

2. **Skip to Step 3** (Run Archival Job) if events are already archived

---

## Step 1: Verify Events Ready for Archival

Before archiving, let's verify the events exist:

### Option A: Using Debug Script

```bash
npx tsx test-archival-debug.ts
```

This shows:

-   ✅ S3 connection status
-   ✅ Companies and their archival status
-   ✅ Events ready for archival
-   ✅ Sample event dates

### Option B: Using Postman

1. **Get Company Info** → Shows your company details
2. **List Workspaces** → Get workspace IDs
3. **Get Company Events** → Check recent events

### Option C: Using SQL (if you have database access)

```sql
-- Check events ready for archival
SELECT COUNT(*) as ready_for_archival
FROM "AuditEvent"
WHERE "archivalCandidate" = true
  AND "archived" = false
  AND "companyId" = 'YOUR_COMPANY_ID';

-- Should return 30 (if fresh seed) or existing count
```

---

## Step 2: Run the Archival Job

The archival job will:

1. Find companies with S3 archival add-on
2. Find events older than retention period (365 days for Acme Corp)
3. Upload them to S3 as compressed JSON files
4. Mark them as archived in the database

### Run Manually:

```bash
npx tsx src/crons/archivalJob.ts
```

**Expected Output:**

```
🔍 Starting archival job...

✅ S3 client initialized

Found 2 companies

Checking company: Acme Corp (cminremf40005f8f5v4lfne2l)
  ✅ Has S3 archival add-on
  Retention days: 365
  Cutoff date: 2024-12-01T23:58:58.462Z
  Total archival candidates: 30
  Events ready for archival (older than 365 days): 30
  🚀 Starting archival process...
  📤 Uploading to S3: {companyId}/{workspaceId}/2023-11-15.json.gz (15 events)
  ✅ Uploaded successfully
  ✅ Marked 15 events as archived
  ...
  ✅ Successfully archived 30 events

Checking company: GlobalTech EU (cminremf40006f8f5zmk3qw6t)
  ⏭️  Skipping - no S3 archival add-on

✅ Archival job completed
```

**If you see errors:**

-   Check S3 credentials in `.env`
-   Verify S3 bucket exists and is accessible
-   Check AWS permissions
-   Run `npx tsx test-archival-debug.ts` to diagnose

---

## Step 3: Verify Events Were Archived

### Check Database:

```sql
-- Check archived events
SELECT COUNT(*) as archived_count
FROM "AuditEvent"
WHERE "archived" = true
  AND "companyId" = 'YOUR_COMPANY_ID';

-- Should return 50 (30 newly archived + 20 already archived) if fresh seed
```

### Check S3:

You can verify files exist in S3 using AWS CLI:

```bash
aws s3 ls s3://your-bucket-name/{companyId}/{workspaceId}/
```

Or check in AWS Console.

### Using Debug Script:

```bash
npx tsx test-archival-debug.ts
```

Look for the "Testing Archival Process" section - it will verify files exist in S3.

---

## Step 4: Test Archive Export Endpoint

Now test retrieving archived events via the API.

### Setup Postman:

1. **Import Postman Collection** (`postman/HyreLog.postman_collection.json`)
2. **Import Postman Environment** (`postman/HyreLog.postman_environment.json`)
3. **Update Environment Variables**:
    - `company_key`: Use the company API key from seed output
    - `workspace_id`: Get from "List Workspaces" response
    - `base_url`: `http://localhost:4040`

### Test Requests:

#### Request 1: Export All Archived Events (Default - Last Year)

**Endpoint**: `GET /v1/key/company/export-archive.json`

**Headers**:

```
x-hyrelog-key: YOUR_COMPANY_KEY
```

**Query Parameters**: None (defaults to last year)

**Expected Response**: JSON array of archived events

```json
[
  {
    "id": "...",
    "action": "user.login",
    "category": "auth",
    "createdAt": "2023-11-15T...",
    ...
  },
  ...
]
```

#### Request 2: Export with Date Range

**Endpoint**: `GET /v1/key/company/export-archive.json?from=2023-11-01&to=2023-11-30`

**Headers**:

```
x-hyrelog-key: YOUR_COMPANY_KEY
```

**Query Parameters**:

-   `from`: `2023-11-01` (ISO 8601 date)
-   `to`: `2023-11-30` (ISO 8601 date)

**Note**: Adjust dates based on when events were actually archived. If you just ran the seed, events are from ~400-450 days ago. Calculate: `today - 400 days`.

**Expected Response**: JSON array of archived events from that date range

#### Request 3: Export Specific Workspace

**Endpoint**: `GET /v1/key/company/export-archive.json?workspaceId=YOUR_WORKSPACE_ID&from=2023-11-01`

**Headers**:

```
x-hyrelog-key: YOUR_COMPANY_KEY
```

**Query Parameters**:

-   `workspaceId`: Your workspace ID
-   `from`: `2023-11-01`

**Expected Response**: JSON array of archived events for that workspace

---

## Step 5: Troubleshooting

### Problem: "S3 archival add-on required"

**Solution**: Make sure you're using the **company API key** (not workspace key) and the company has the S3 archival add-on enabled.

**Check**: Run "Get Company Info" endpoint - it should show the company has S3 archival.

### Problem: "S3 not configured"

**Solution**: Check your `.env` file has all S3 variables:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=your_bucket
```

### Problem: Empty response `[]`

**Possible Causes**:

1. **No archived files in date range**: The date range you specified doesn't match when events were archived
    - **Solution**: Use a wider date range or check when events were actually created
    - **Tip**: Run `npx tsx test-archival-debug.ts` to see actual event dates
2. **Events not archived yet**: You haven't run the archival job

    - **Solution**: Run `npx tsx src/crons/archivalJob.ts`

3. **Wrong workspace**: Events might be in a different workspace
    - **Solution**: Try without `workspaceId` to get all workspaces

### Problem: "NoSuchKey" errors in logs

**This is normal**: The endpoint tries to fetch files for every day in the date range. Missing files are silently skipped. Only actual errors are logged.

### Problem: Date format errors

**Solution**: Use ISO 8601 format: `YYYY-MM-DD` (e.g., `2023-11-15`)

### Problem: Archival job shows "No events to archive"

**Possible Causes**:

1. Events aren't old enough yet (need to be older than retention period)
2. Events aren't marked as `archivalCandidate: true`
3. Events are already archived

**Solution**: Run `npx tsx test-archival-debug.ts` to see detailed state

---

## Step 6: Verify Complete Workflow

### Complete Test Checklist:

-   [ ] ✅ Database seeded with test data (or existing data verified)
-   [ ] ✅ S3 connection verified (`test-archival-debug.ts`)
-   [ ] ✅ Events marked as `archivalCandidate: true` exist
-   [ ] ✅ Archival job runs successfully
-   [ ] ✅ Events uploaded to S3 (check S3 console or debug script)
-   [ ] ✅ Events marked as `archived: true` in database
-   [ ] ✅ Archive export endpoint returns archived events
-   [ ] ✅ Date filtering works correctly
-   [ ] ✅ Workspace filtering works correctly

---

## Quick Reference

### Useful Commands:

```bash
# Test S3 connection and database state
npx tsx test-archival-debug.ts

# Run archival job
npx tsx src/crons/archivalJob.ts

# Clean up S3 (deletes all files!)
npx tsx scripts/cleanup-s3.ts

# Reset database
npm run seed
```

### API Keys from Seed:

-   **Company Key**: Use for archival export endpoints
-   **Workspace Keys**: Use for event ingestion and workspace-specific queries

### Important Endpoints:

-   `GET /v1/key/company` - Get company info
-   `GET /v1/key/company/workspaces` - List workspaces
-   `GET /v1/key/company/export-archive.json` - Export archived events
-   `POST /v1/key/workspace/events` - Ingest new events

### Date Format:

Always use ISO 8601: `YYYY-MM-DD` (e.g., `2023-11-15`)

### S3 File Structure:

```
{companyId}/{workspaceId}/{YYYY-MM-DD}.json.gz
```

Example: `cminremf40005f8f5v4lfne2l/cminremz2000af8f5nuyozdcz/2023-11-15.json.gz`

### Calculating Date Ranges:

If events were created ~400 days ago:

-   Today: Dec 2, 2024
-   400 days ago: ~Nov 2023
-   Use: `from=2023-11-01&to=2023-11-30`

---

## Next Steps

After testing archival:

1. Test event ingestion with workspace keys
2. Test regular export endpoints (JSON/CSV)
3. Test SSE tailing endpoint
4. Test webhook delivery
