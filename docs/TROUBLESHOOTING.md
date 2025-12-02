# Troubleshooting Guide

## Archival Issues

### Files Not Appearing in S3

**Symptoms**: Archival job runs successfully but files don't appear in S3 bucket.

**Diagnosis**:
```bash
# Run diagnostic script
npx tsx scripts/diagnose-archival.ts

# Verify files in S3
npx tsx scripts/verify-s3-archives.ts
```

**Common Causes**:

1. **Looking in Wrong Location**
   - Files are nested: `{companyId}/{workspaceId}/{date}.json.gz`
   - Navigate into the company folder first, then workspace folder
   - Use the verification script to see exact paths

2. **Wrong Bucket**
   - Check `AWS_S3_BUCKET` in `.env` matches your bucket name
   - Verify region matches: `AWS_REGION`

3. **IAM Permissions**
   - User needs `s3:PutObject` permission
   - Test with: `node test-s3.js`

4. **Events Already Archived**
   - Once archived, events won't be re-archived
   - Check: `SELECT COUNT(*) FROM "AuditEvent" WHERE archived = true;`
   - Create new test events: `npx tsx scripts/test-archival.ts`

**Solution**:
```bash
# 1. Verify S3 connection
node test-s3.js

# 2. Check what's ready for archival
npx tsx scripts/diagnose-archival.ts

# 3. Create test events if needed
npx tsx scripts/test-archival.ts

# 4. Run archival job with logging
npx tsx src/crons/archivalJob.ts

# 5. Verify files uploaded
npx tsx scripts/verify-s3-archives.ts
```

## Worker Issues

### Worker Exits Immediately

**Symptoms**: `npm run worker` starts then exits right away.

**Causes**:
- Database connection error
- Missing environment variables
- TypeScript compilation errors

**Solution**:
```bash
# Check for errors
npm run lint

# Verify database connection
npx prisma studio

# Check environment variables
cat .env | grep DATABASE_URL
```

### Webhooks Not Delivering

**Symptoms**: Webhook deliveries stay in `PENDING` status.

**Check**:
1. Worker is running: `ps aux | grep worker`
2. Webhooks are active: `SELECT * FROM "Webhook" WHERE "isActive" = true;`
3. Deliveries exist: `SELECT * FROM "WebhookDelivery" WHERE status = 'PENDING';`
4. Webhook URLs are accessible (test with curl)

**Solution**:
```bash
# Start worker
npm run worker

# Check logs for errors
# Worker should show: "Processed X webhook deliveries"
```

## Migration Issues

### AddOn Code Enum Error

**Error**: `Changed the type of code on the AddOn table`

**Solution**:
```sql
-- Update existing AddOn codes
UPDATE "AddOn" SET "code" = 'RETENTION_S3_ARCHIVE' WHERE "code" = 'old-code';

-- Then run migration
npx prisma migrate deploy
```

## API Issues

### 401 Unauthorized

**Causes**:
- Missing API key header
- Invalid API key
- Revoked API key

**Solution**:
- Check header: `x-hyrelog-key: YOUR_KEY`
- Verify key in database: `SELECT * FROM "ApiKey" WHERE "revokedAt" IS NULL;`
- Regenerate keys if needed

### 429 Too Many Requests

**Causes**:
- Rate limit exceeded
- Too many requests per minute

**Solution**:
- Wait for rate limit window to reset
- Check limits in `.env`: `RATE_LIMIT_PER_KEY`, `RATE_LIMIT_PER_IP`

### 402/429 Billing Limit

**Causes**:
- Event limit exceeded
- Hard cap reached

**Solution**:
- Check billing meter: `SELECT * FROM "BillingMeter";`
- Upgrade plan or wait for next billing period

## Database Issues

### Connection Errors

**Error**: `Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` in `.env`
2. Check database is running
3. Verify network/firewall settings
4. Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

### Prisma Client Errors

**Error**: `Module '@prisma/client' has no exported member`

**Solution**:
```bash
npx prisma generate
npm run lint
```

## S3 Issues

### Access Denied

**Error**: `Access Denied` when uploading

**Solutions**:
1. Verify IAM user has `s3:PutObject` permission
2. Check bucket name is correct
3. Verify region matches bucket region
4. Test with: `node test-s3.js`

### Files Not Found

**Error**: `NoSuchKey` when reading

**Solutions**:
1. Verify file path format: `{companyId}/{workspaceId}/{YYYY-MM-DD}.json.gz`
2. Check files exist: `npx tsx scripts/verify-s3-archives.ts`
3. Verify bucket name and region

## Export Issues

### Empty Export

**Symptoms**: Export endpoint returns empty array

**Causes**:
- No events match filters
- Events are archived (only non-archived returned)
- Retention window excludes events

**Solution**:
- Check events exist: `SELECT COUNT(*) FROM "AuditEvent";`
- Verify filters: `?from=...&to=...`
- Check retention: Events older than retention window are excluded

### Export Limit Exceeded

**Symptoms**: Export stops at plan limit

**Solution**:
- Upgrade plan for higher limits
- Use date filters to reduce export size
- Export archived events separately: `/export-archive.json`

## General Debugging

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug

# Or in .env
LOG_LEVEL=debug
```

### Check Database State

```bash
# Open Prisma Studio
npx prisma studio

# Or use psql
psql $DATABASE_URL
```

### Verify Environment

```bash
# Check all env vars are set
node -e "require('dotenv').config(); console.log(process.env)"
```

### Common Commands

```bash
# Regenerate Prisma client
npx prisma generate

# Check migration status
npx prisma migrate status

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database
npx prisma studio
```

