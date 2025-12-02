# Phase 3 Setup Guide

## Environment Variables

### No New Environment Variables Required! ✅

Phase 3 uses the **same environment variables** as Phase 2. No changes needed to your `.env` file.

**Existing variables (still required):**

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/dbname
API_KEY_SECRET=your-secret-min-32-chars-long

# Internal API (for /internal/* endpoints)
INTERNAL_TOKEN=your-internal-token-min-32-chars

# S3 (optional - only if using archival)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# OpenTelemetry (optional)
OTEL_SERVICE_NAME=hyrelog-api
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-endpoint
```

### How Region Configuration Works

**Important**: Region-specific database URLs are stored in the `RegionDataStore` table, **not** in environment variables.

-   The seed script automatically creates the AU region pointing to your `DATABASE_URL`
-   For additional regions (US/EU/APAC), you'll insert `RegionDataStore` records with their respective database URLs
-   This allows each region to have its own database connection string

## AWS Setup Changes

### 1. S3 Setup (Same as Phase 2)

No changes needed if you already have S3 configured. If not:

1. **Create S3 Bucket** (if not already done):

    - Name: `hyrelog-archives-prod` (or your choice)
    - Region: `us-east-1` (or your preference)
    - Keep defaults (private bucket)

2. **IAM User Permissions** (if not already done):
    - User: `hyrelog-archival-user`
    - Permissions: `s3:PutObject`, `s3:GetObject`, `s3:ListBucket`
    - **Note**: For cold storage cleanup, you may want `s3:DeleteObject` (but not required for archival user)

### 2. Cold Storage Setup (New for Phase 3)

**Option A: AWS Glacier Deep Archive via S3 Lifecycle Policies** (Recommended)

1. **Enable S3 Lifecycle Transitions**:

    - Go to your S3 bucket → Management → Lifecycle rules
    - Create a new rule:
        - Name: `Move to Glacier Deep Archive`
        - Prefix: `*/` (or specific prefix like `archives/`)
        - Transitions:
            - After 90 days: Move to Glacier Deep Archive
        - Expiration: None (keep forever)

2. **IAM Permissions** (if using Glacier API directly):
    - Add `glacier:InitiateJob`, `glacier:DescribeJob`, `glacier:GetJobOutput` permissions
    - **Note**: Currently, Phase 3 uses S3 lifecycle policies, so Glacier API permissions are optional

**Option B: Manual Cold Storage** (Future)

-   Azure Archive: Configure Azure Storage Account
-   GCP Coldline: Configure GCP Storage Bucket with Coldline storage class

### 3. Multi-Region AWS Setup (Future)

When you're ready to add US/EU/APAC regions:

1. **Create Regional S3 Buckets**:

    - `hyrelog-archives-us` (US region)
    - `hyrelog-archives-eu` (EU region)
    - `hyrelog-archives-apac` (APAC region)

2. **Create Regional Databases**:

    - Set up PostgreSQL instances in each region
    - Get connection strings for each

3. **Insert RegionDataStore Records**:
    ```sql
    INSERT INTO "RegionDataStore" (id, region, "dbUrl", "readOnlyUrl", "coldStorageProvider", "coldStorageBucket")
    VALUES
      ('cuid-us', 'US', 'postgresql://us-db-url', NULL, 'aws', 'hyrelog-archives-us'),
      ('cuid-eu', 'EU', 'postgresql://eu-db-url', NULL, 'aws', 'hyrelog-archives-eu'),
      ('cuid-apac', 'APAC', 'postgresql://apac-db-url', NULL, 'aws', 'hyrelog-archives-apac');
    ```

## Database Migration

### Step 1: Run Migration

```bash
npx prisma migrate dev --name phase3-multi-region
```

This will:

-   Add `Region` enum
-   Add `replicateTo` array to `Company`
-   Create `RegionDataStore` table
-   Create `GlobalEventIndex` table
-   Create `GdprRequest` and `GdprRequestApproval` tables
-   Create `PendingWrite` table
-   Add cold storage fields to `AuditEvent`

### Step 2: Seed RegionDataStore

The seed script automatically creates the AU region:

```bash
npm run seed
```

Or manually:

```sql
INSERT INTO "RegionDataStore" (id, region, "dbUrl", "readOnlyUrl", "coldStorageProvider", "coldStorageBucket")
VALUES (
  'cuid-here',
  'AU',
  'your-database-url',
  NULL,
  'aws',
  'your-s3-bucket-name'
);
```

### Step 3: Update Existing Companies

If you have existing companies, update them:

```sql
-- Set default region to AU
UPDATE "Company" SET "dataRegion" = 'AU' WHERE "dataRegion" IS NULL;

-- Set empty replication array
UPDATE "Company" SET "replicateTo" = '{}' WHERE "replicateTo" IS NULL;
```

## Verification

### 1. Check RegionDataStore

```bash
npx prisma studio
# Navigate to RegionDataStore table
# Should see one record with region='AU'
```

### 2. Test New Endpoints

See Postman collection updates below.

### 3. Check Cron Jobs

Start the server and verify Phase 3 cron jobs are running:

```bash
npm run dev
```

You should see:

-   "Running cold archive job" (weekly)
-   "Running failover recovery job" (every 5 min)
-   "Running region health check" (every 1 min)
-   "Running GDPR worker" (every 10 min)
-   "Running replication worker" (every 5 min)

## Summary

✅ **No new environment variables needed**
✅ **No AWS changes needed** (unless setting up cold storage lifecycle policies)
✅ **Same S3 setup as Phase 2**
✅ **Database migration required** (adds new tables)
✅ **Seed script creates AU region automatically**

The main change is that region configuration is now stored in the database (`RegionDataStore` table) rather than environment variables, making it easier to add new regions without code changes.
