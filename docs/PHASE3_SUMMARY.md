# Phase 3 Implementation Summary

## Overview

Phase 3 introduces multi-region architecture, GDPR workflows, cold storage, failover capabilities, and region-aware infrastructure to HyreLog.

## ✅ Completed Features

### 1. Multi-Region Architecture

- **Schema Updates**:
  - Added `Region` enum (AU, US, EU, APAC)
  - Updated `Company` model with `dataRegion` (defaults to AU) and `replicateTo` array
  - Added `RegionDataStore` model for region configuration
  - Added `GlobalEventIndex` model for cross-region metadata queries
  - Added `PendingWrite` model for failover queue

- **Region Client Layer** (`src/lib/regionClient.ts`):
  - Dynamic Prisma client creation per region
  - Caching of region clients
  - Helpers: `getPrismaForRegion()`, `getRegionForCompany()`, `getPrismaForCompany()`, `getColdStorageClientForRegion()`

- **Region Broker** (`src/lib/regionBroker.ts`):
  - Event ingestion routing to regional databases
  - GlobalEventIndex metadata writes
  - Workspace and company event querying with region routing
  - Global multi-region search functionality

### 2. GDPR System

- **Schema Updates**:
  - Added `GdprRequest` model with two-step approval workflow
  - Added `GdprRequestApproval` model for tracking approvals
  - Status flow: `CUSTOMER_PENDING` → `CUSTOMER_APPROVED` → `ADMIN_APPROVED` → `PROCESSING` → `DONE`

- **GDPR Worker** (`src/workers/gdprWorker.ts`):
  - Processes anonymization requests
  - Processes deletion requests (anonymizes instead of deleting to preserve hash chain)
  - Batch processing with error handling

### 3. Cold Storage

- **Cold Storage Module** (`src/lib/coldStorage.ts`):
  - AWS Glacier Deep Archive support (via S3 lifecycle policies)
  - Azure Archive and GCP Coldline placeholders
  - Archive and retrieval functions

- **Cold Archive Job** (`src/crons/coldArchiveJob.ts`):
  - Weekly job to move old S3 archived events to cold storage
  - Updates `isColdArchived` and `coldArchiveKey` flags
  - Processes events older than 1 year in warm storage

### 4. Disaster Recovery & Failover

- **Failover Module** (`src/lib/failover.ts`):
  - Region health checking
  - Manual failover triggers
  - Pending write queue management
  - Recovery processing

- **Failover Recovery Job** (`src/crons/failoverRecovery.ts`):
  - Processes pending writes when regions recover
  - Runs every 5 minutes

### 5. Cross-Region Replication

- **Replication Worker** (`src/workers/replicationWorker.ts`):
  - Replicates events from primary region to replica regions
  - Maintains hash chain integrity
  - Processes companies with `replicateTo` configured
  - Runs every 5 minutes

### 6. Region-Aware Infrastructure

- **Region Cron Utility** (`src/lib/regionCron.ts`):
  - `runCronPerRegion()` - runs cron callbacks for each region
  - `runCronForRegion()` - runs cron for specific region

- **Region Health Check** (`src/crons/regionHealthCheck.ts`):
  - Checks health of all regions every minute
  - Logs latency and status

- **Edge Caching** (`src/lib/edgeCache.ts`):
  - In-memory cache implementation
  - Cache key generators for company/workspace events
  - Cache invalidation helpers
  - Ready for Redis/Upstash/Cloudflare KV integration

### 7. New API Endpoints

- **`GET /v1/key/company/events/global`** (`src/routes/key.company.global.ts`):
  - Global multi-region event search
  - Uses GlobalEventIndex for metadata lookup
  - Fetches full events from regional databases
  - Merges and sorts results

- **`GET /v1/key/company/regions`** (`src/routes/key.company.regions.ts`):
  - Returns company's primary region
  - Lists replica regions
  - Shows region health status
  - Includes cold storage configuration

- **`GET /internal/region-health`** (`src/routes/internal.region-health.ts`):
  - Internal endpoint for region monitoring
  - Requires `x-internal-token` header
  - Returns health status, latency, pending writes, replication backlog

### 8. Updated Routes

- **Workspace Events** (`src/routes/key.workspace.events.ts`):
  - Event ingestion now uses `ingestEventToRegion()` from regionBroker
  - Event queries use `queryWorkspaceEvents()` from regionBroker
  - Cache invalidation on ingestion

- **Company Events** (`src/routes/key.company.events.ts`):
  - Event queries use `queryCompanyEvents()` from regionBroker

### 9. Cron Jobs

All Phase 3 cron jobs are registered in `src/lib/cronScheduler.ts`:
- Cold Archive Job: Weekly (Sunday 3 AM)
- Failover Recovery: Every 5 minutes
- Region Health Check: Every 1 minute
- GDPR Worker: Every 10 minutes
- Replication Worker: Every 5 minutes

### 10. Seed Script Updates

- Added `RegionDataStore` seed (AU region)
- Updated companies to use `Region.AU` (AU-first)
- Added `replicateTo: []` to companies
- Added sample GDPR requests:
  - One in `CUSTOMER_PENDING` status
  - One in `CUSTOMER_APPROVED` status with approval record

## 🔄 Architecture Notes

### Region Routing Flow

1. **Event Ingestion**:
   - Identify company → get region (defaults to AU)
   - Write event to regional database
   - Write metadata to GlobalEventIndex (primary DB)
   - Queue replication if `replicateTo` configured

2. **Event Queries**:
   - Workspace key: Route to workspace's region
   - Company key: Route to company's primary region
   - Global search: Query GlobalEventIndex, fetch from regional DBs, merge results

3. **Failover**:
   - If region unavailable, queue writes to `PendingWrite` table
   - Recovery job processes pending writes when region recovers

### Data Flow

```
Event Ingestion → Region Broker → Regional DB + GlobalEventIndex
                                    ↓
                              Replication Worker (if replicateTo configured)
                                    ↓
                              Replica Regional DBs
```

## 📋 Migration Steps

1. **Run Prisma Migration**:
   ```bash
   npx prisma migrate dev --name phase3-multi-region
   ```

2. **Seed RegionDataStore**:
   The seed script will create the AU region data store. For production:
   ```sql
   INSERT INTO "RegionDataStore" (id, region, "dbUrl", "readOnlyUrl", "coldStorageProvider", "coldStorageBucket")
   VALUES ('cuid', 'AU', 'postgresql://...', NULL, 'aws', 'your-bucket');
   ```

3. **Update Existing Companies**:
   ```sql
   UPDATE "Company" SET "dataRegion" = 'AU' WHERE "dataRegion" IS NULL;
   UPDATE "Company" SET "replicateTo" = '{}' WHERE "replicateTo" IS NULL;
   ```

4. **Restart Server**:
   The server will automatically start all Phase 3 cron jobs.

## 🚀 Next Steps

1. **Add More Regions**: Insert additional `RegionDataStore` records for US/EU/APAC
2. **Configure Replication**: Set `replicateTo` on Enterprise companies
3. **Set Up Cold Storage**: Configure AWS Glacier lifecycle policies
4. **Monitor Region Health**: Use `/internal/region-health` endpoint
5. **Test GDPR Workflow**: Use dashboard to create and approve GDPR requests

## ⚠️ Important Notes

- **AU-First**: All companies default to AU region initially
- **No Breaking Changes**: Phase 1 and Phase 2 functionality remains intact
- **Backward Compatible**: Existing events continue to work
- **GDPR Security**: GDPR requests can only be created via dashboard (not API keys)
- **Hash Chain Integrity**: GDPR deletion anonymizes events but preserves hash chain

## 📚 Related Documentation

- `docs/ARCHIVAL_TESTING_GUIDE.md` - S3 archival testing
- `docs/S3_SETUP_GUIDE.md` - S3 configuration
- `docs/MIGRATION_GUIDE.md` - Database migration guide

