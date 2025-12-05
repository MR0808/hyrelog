# Quick Start Guide - Phase 2 Setup

## 🚀 Complete Setup in 5 Steps

### Step 1: Run Migration

```bash
# Check if you have existing AddOn records
npx prisma studio
# Or: psql $DATABASE_URL -c "SELECT code FROM \"AddOn\";"

# If you have existing AddOn records, update them first:
# UPDATE "AddOn" SET "code" = 'RETENTION_S3_ARCHIVE' WHERE "code" = 'old-code';

# Run migration
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

**📖 Full details**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

### Step 2: Set Up S3 (Optional - Only if using archival)

1. **Create S3 Bucket**:
   - Go to AWS Console → S3 → Create bucket
   - Name: `hyrelog-archives-prod` (or your choice)
   - Region: `us-east-1` (or your preference)
   - Keep defaults (private bucket)

2. **Create IAM User**:
   - Go to AWS Console → IAM → Users → Create user
   - Name: `hyrelog-archival-user`
   - Attach policy with S3 PutObject, GetObject, ListBucket permissions
   - Save Access Key ID and Secret Access Key

3. **Add to `.env`**:
   ```bash
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=hyrelog-archives-prod
   ```

**📖 Full details**: See [S3_SETUP_GUIDE.md](./S3_SETUP_GUIDE.md)

### Step 3: Configure Environment Variables

Add to your `.env` file:

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

### Step 4: Run Seed Script

```bash
npm run seed
```

This creates:
- ✅ 2 companies (Acme Corp, GlobalTech EU)
- ✅ 3 workspaces
- ✅ 3 projects
- ✅ 4 API keys (1 company, 3 workspace)
- ✅ 3 webhooks (company-wide + workspace-specific)
- ✅ 2 workspace templates
- ✅ 100 audit events
- ✅ Sample threshold alerts
- ✅ Billing meters and usage stats

**Save the API keys** displayed at the end - you'll need them for testing!

### Step 5: Start Services

```bash
# Terminal 1: Start API server
npm run dev

# Terminal 2: Start webhook worker
npm run worker
```

## 🧪 Test Your Setup

### 1. Test Health Endpoint

```bash
curl -H "x-internal-token: your-internal-token" \
  http://localhost:4040/internal/health
```

### 2. Test Company API Key

```bash
# Use the company key from seed output
curl -H "x-hyrelog-key: YOUR_COMPANY_KEY" \
  http://localhost:4040/v1/key/company
```

### 3. Test Workspace API Key

```bash
# Use a workspace key from seed output
curl -H "x-hyrelog-key: YOUR_WORKSPACE_KEY" \
  http://localhost:4040/v1/key/workspace
```

### 4. Test Event Ingestion

**⚠️ Important**: Use the correct endpoint `/v1/key/workspace/events` (not `/v1/events`)

```bash
curl -X POST \
  -H "x-hyrelog-key: YOUR_WORKSPACE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "user.login",
    "category": "auth",
    "actor": {
      "id": "user-123",
      "email": "user@example.com"
    },
    "payload": {
      "ip": "192.168.1.1"
    }
  }' \
  http://localhost:4040/v1/key/workspace/events
```

**Common mistakes:**
- ❌ `/v1/events` - This endpoint does not exist
- ✅ `/v1/key/workspace/events` - Correct endpoint for workspace event ingestion
- ✅ `/v1/key/company/events` - Correct endpoint for company event queries (GET only)

### 5. Test Export

```bash
# JSON export
curl -H "x-hyrelog-key: YOUR_COMPANY_KEY" \
  http://localhost:4040/v1/key/company/export.json > export.json

# CSV export
curl -H "x-hyrelog-key: YOUR_COMPANY_KEY" \
  http://localhost:4040/v1/key/company/export.csv > export.csv
```

### 6. Test SSE Tailing (Growth plan+)

```bash
curl -N -H "x-hyrelog-key: YOUR_WORKSPACE_KEY" \
  http://localhost:4040/v1/key/workspace/events/tail
```

## 📋 Checklist

- [ ] Migration applied successfully
- [ ] S3 bucket created and configured (if using archival)
- [ ] Environment variables set in `.env`
- [ ] Seed script run successfully
- [ ] API server running (`npm run dev`)
- [ ] Webhook worker running (`npm run worker`)
- [ ] Health endpoint responds
- [ ] API keys work
- [ ] Event ingestion works
- [ ] Exports work

## 🐛 Troubleshooting

**Migration fails**: Check [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

**S3 errors**: Check [S3_SETUP_GUIDE.md](./S3_SETUP_GUIDE.md)

**API errors**: 
- Verify API keys are correct
- Check server logs
- Verify database connection

**Webhook worker not processing**:
- Check worker logs
- Verify webhooks are active in database
- Check webhook URLs are accessible

## 📚 Next Steps

- Read [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md) for feature details
- Check [API README](./api/README.md) for endpoint documentation
- Import Postman collection for API testing

