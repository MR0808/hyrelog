# Worker Guide

## Overview

HyreLog uses background workers to process async tasks:
- **Webhook Delivery Worker**: Delivers webhooks with retry logic
- **Job Processor**: Processes GDPR export jobs

## Running Workers

### Option 1: Combined Worker (Recommended)

Runs both workers in a single process:

```bash
npm run worker
```

This starts:
- Webhook delivery worker (processes every 1 minute)
- Job processor (processes every 5 seconds)

**Output:**
```
🚀 HyreLog Workers Started
   - Webhook delivery worker: every 1 minute
   - Job processor: every 5 seconds
   Press Ctrl+C to stop

[Webhook] Processed 5 deliveries
[Job] Processing job abc123...
```

### Option 2: Separate Workers

Run workers individually:

```bash
# Webhook worker only
npm run worker:webhook

# Job processor only
npm run worker:jobs
```

## Worker Behavior

### Webhook Delivery Worker

- **Frequency**: Every 1 minute
- **Processes**: Webhook deliveries with status `PENDING` or `FAILED` (with `nextAttemptAt <= now`)
- **Retry Logic**: Exponential backoff
  - 1st attempt: Immediate
  - 2nd attempt: +1 minute
  - 3rd attempt: +5 minutes
  - 4th attempt: +30 minutes
  - 5th attempt: +6 hours
  - After 5 attempts: Marked as `FAILED`

### Job Processor

- **Frequency**: Every 5 seconds
- **Processes**: Pending GDPR export jobs
- **Status Flow**: `PENDING` → `PROCESSING` → `COMPLETED` or `FAILED`

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start workers
pm2 start npm --name "hyrelog-worker" -- run worker

# Monitor
pm2 logs hyrelog-worker

# Stop
pm2 stop hyrelog-worker
```

### Using systemd (Linux)

Create `/etc/systemd/system/hyrelog-worker.service`:

```ini
[Unit]
Description=HyreLog Background Workers
After=network.target

[Service]
Type=simple
User=hyrelog
WorkingDirectory=/opt/hyrelog
ExecStart=/usr/bin/npm run worker
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable hyrelog-worker
sudo systemctl start hyrelog-worker
sudo systemctl status hyrelog-worker
```

### Using Docker

```dockerfile
# Dockerfile.worker
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["node", "dist/workers/index.js"]
```

```bash
docker build -f Dockerfile.worker -t hyrelog-worker .
docker run -d --name hyrelog-worker \
  --env-file .env \
  hyrelog-worker
```

## Monitoring

### Check Worker Status

```bash
# Check if worker is running
ps aux | grep "worker"

# Check logs
tail -f logs/worker.log  # if logging to file
```

### Database Queries

```sql
-- Check pending webhook deliveries
SELECT COUNT(*) FROM "WebhookDelivery" 
WHERE status = 'PENDING';

-- Check failed webhooks
SELECT COUNT(*) FROM "WebhookDelivery" 
WHERE status = 'FAILED' AND "nextAttemptAt" <= NOW();

-- Check pending jobs
SELECT COUNT(*) FROM "Job" 
WHERE status = 'PENDING';
```

## Troubleshooting

### Worker Exits Immediately

**Problem**: Worker starts then exits right away.

**Solutions**:
1. Check for errors in console output
2. Verify database connection (`DATABASE_URL`)
3. Check that Prisma client is generated: `npx prisma generate`
4. Ensure no syntax errors: `npm run lint`

### Webhooks Not Delivering

**Check**:
1. Webhooks are active: `SELECT * FROM "Webhook" WHERE "isActive" = true;`
2. Deliveries exist: `SELECT * FROM "WebhookDelivery" WHERE status = 'PENDING';`
3. Worker is running: `ps aux | grep worker`
4. Webhook URLs are accessible (test with curl)

### Jobs Not Processing

**Check**:
1. Jobs exist: `SELECT * FROM "Job" WHERE status = 'PENDING';`
2. Worker is running
3. Check job processor logs for errors

### High Memory Usage

**Solutions**:
1. Reduce batch sizes in worker code
2. Add memory limits in PM2/systemd
3. Monitor with `pm2 monit` or similar

## Development

### Running in Development

```bash
# Watch mode (auto-restart on changes)
tsx watch src/workers/index.ts

# Or use nodemon
nodemon --exec tsx src/workers/index.ts
```

### Testing Workers

```bash
# Create test webhook delivery
# (via API or directly in database)

# Create test job
# (via API: POST /v1/key/company/gdpr/export)

# Run worker and watch it process
npm run worker
```

## Best Practices

1. **Run in Separate Process**: Don't run workers in the same process as the API server
2. **Monitor Logs**: Set up log aggregation (CloudWatch, Datadog, etc.)
3. **Set Up Alerts**: Alert on worker failures or high queue sizes
4. **Scale Horizontally**: Run multiple worker instances for high throughput
5. **Graceful Shutdown**: Workers handle SIGINT/SIGTERM for clean shutdowns

