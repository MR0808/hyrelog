# Migration Guide - Phase 2

## Step-by-Step Migration Instructions

### 1. Check Current Database State

First, verify your current database connection and check if you have existing AddOn records:

```bash
# Connect to your database and check for existing AddOn records
npx prisma studio
# Or use psql:
# psql $DATABASE_URL -c "SELECT code FROM \"AddOn\";"
```

### 2. Handle AddOn Code Enum Change (If Needed)

The migration changes `AddOn.code` from `String` to `AddOnCode` enum. If you have existing AddOn records, you need to update them first.

**Option A: If you have NO existing AddOn records (Fresh Database)**

-   You can proceed directly to step 3.

**Option B: If you have existing AddOn records**

-   You need to update them to match the enum values before running the migration.

```sql
-- Connect to your database
psql $DATABASE_URL

-- Check current AddOn codes
SELECT id, code FROM "AddOn";

-- Update existing codes to match the enum (example)
-- If you have a code like "retention_plus", update it:
UPDATE "AddOn" SET "code" = 'RETENTION_S3_ARCHIVE' WHERE "code" = 'retention_plus';

-- Verify the update
SELECT id, code FROM "AddOn";
```

**Note**: The enum only supports `RETENTION_S3_ARCHIVE`. If you have other codes, you'll need to either:

-   Delete those AddOn records, or
-   Add them to the enum in `prisma/schema.prisma` first

### 3. Run the Migration

Once your AddOn codes are ready, run the migration:

```bash
# Generate Prisma client first (if needed)
npx prisma generate

# Run the migration
npx prisma migrate deploy

# Or for development (creates migration and applies it):
npx prisma migrate dev --name phase2_foundation
```

### 4. Verify Migration Success

Check that all new tables and columns were created:

```bash
# List all migrations
npx prisma migrate status

# Or check tables directly
npx prisma studio
```

You should see these new tables:

-   `Webhook`
-   `WebhookDelivery`
-   `WorkspaceTemplate`
-   `WorkspaceTemplateAssignment`
-   `ThresholdAlert`

And these new columns:

-   `Company.dataRegion`
-   `AuditEvent.traceId`
-   `AuditEvent.archived`
-   `AuditEvent.archivalCandidate`
-   `AuditEvent.dataRegion`

### 5. Run Seed Script (Optional)

After migration, you can seed test data:

```bash
npm run seed
```

This will create sample companies, workspaces, API keys, webhooks, templates, and events for testing.

### Troubleshooting

**Error: "column would be dropped and recreated"**

-   This means you have existing AddOn records. Follow Option B in step 2.

**Error: "Can't reach database server"**

-   Check your `DATABASE_URL` in `.env`
-   Verify your database is running and accessible
-   Check firewall/network settings

**Error: "enum value does not exist"**

-   Make sure you updated existing AddOn codes to match the enum values
-   The enum only supports: `RETENTION_S3_ARCHIVE`

**Migration partially applied**

-   Check migration status: `npx prisma migrate status`
-   If needed, manually fix the database state and mark migration as applied:
    ```bash
    npx prisma migrate resolve --applied 20251201210935_phase2_foundation
    ```
