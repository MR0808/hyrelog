# Environment Variable Templates

Complete environment variable templates for all HyreLog components.

## API Server (HyreLog Backend)

### Production Environment Variables

Create `.env.production` or configure in AWS Secrets Manager / ECS Task Definition:

```bash
# Application
NODE_ENV=production
PORT=4040
HOST=0.0.0.0

# Database (Primary - US Region)
DATABASE_URL=postgresql://postgres:AKn58fAsiYyCd8Ersq36@hyrelog-us-primary.cs7ic6mo2af4.us-east-1.rds.amazonaws.com:5432/hyrelog?sslmode=require

# Security
API_KEY_SECRET=<64-character-random-secret>
INTERNAL_TOKEN=<32-character-random-secret>

# Rate Limiting
RATE_LIMIT_PER_KEY=1200
RATE_LIMIT_PER_IP=600
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_BURST_MULTIPLIER=2.0
RATE_LIMIT_REFILL_RATE=20

# Billing
BILLING_HARD_CAP_RESPONSE=429

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<iam-user-access-key>
AWS_SECRET_ACCESS_KEY=<iam-user-secret-key>
AWS_S3_BUCKET=hyrelog-archival-us

# OpenTelemetry (Observability)
OTEL_SERVICE_NAME=hyrelog-api
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<your-api-key>
```

### Development Environment Variables

Create `.env.development`:

```bash
# Application
NODE_ENV=development
PORT=4040
HOST=0.0.0.0

# Database (Local or Dev RDS)
DATABASE_URL=postgresql://postgres:password@localhost:5432/hyrelog_dev

# Security
API_KEY_SECRET=dev-secret-key-minimum-32-characters-long-for-development
INTERNAL_TOKEN=dev-internal-token-32-chars

# Rate Limiting (More lenient for dev)
RATE_LIMIT_PER_KEY=10000
RATE_LIMIT_PER_IP=5000
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_BURST_MULTIPLIER=3.0

# Billing
BILLING_HARD_CAP_RESPONSE=429

# AWS Configuration (Optional for dev)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# OpenTelemetry (Optional for dev)
OTEL_SERVICE_NAME=hyrelog-api-dev
OTEL_EXPORTER_OTLP_ENDPOINT=
```

### Multi-Region Configuration

For each region, you'll need region-specific variables. Store these in AWS Secrets Manager per region:

**US Region (us-east-1):**

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@hyrelog-us-primary.xxxxx.us-east-1.rds.amazonaws.com:5432/hyrelog?sslmode=require
AWS_REGION=us-east-1
AWS_S3_BUCKET=hyrelog-archival-us
```

**EU Region (eu-west-1):**

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@hyrelog-eu-primary.xxxxx.eu-west-1.rds.amazonaws.com:5432/hyrelog?sslmode=require
AWS_REGION=eu-west-1
AWS_S3_BUCKET=hyrelog-archival-eu
```

**AU Region (ap-southeast-2):**

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@hyrelog-au-primary.xxxxx.ap-southeast-2.rds.amazonaws.com:5432/hyrelog?sslmode=require
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET=hyrelog-archival-au
```

---

## Dashboard (Next.js)

### Production Environment Variables

Configure in Vercel/Amplify dashboard or `.env.production`:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://dashboard.hyrelog.com

# Database (Primary - US Region)
DATABASE_URL=postgresql://postgres:PASSWORD@hyrelog-us-primary.xxxxx.us-east-1.rds.amazonaws.com:5432/hyrelog?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=<64-character-random-secret>
BETTER_AUTH_URL=https://dashboard.hyrelog.com

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@hyrelog.com
RESEND_FROM_NAME=HyreLog

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# API Endpoint (for dashboard to call API)
NEXT_PUBLIC_API_URL=https://api.hyrelog.com
```

### Development Environment Variables

Create `.env.local`:

```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/hyrelog_dev

# Better Auth
BETTER_AUTH_SECRET=dev-secret-key-minimum-64-characters-long-for-development-only
BETTER_AUTH_URL=http://localhost:3000

# Email (Optional - use Resend test mode)
RESEND_API_KEY=re_test_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=dev@hyrelog.local
RESEND_FROM_NAME=HyreLog Dev

# Stripe (Test mode)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxxxxxxxxxxxxxxxxxx

# API Endpoint
NEXT_PUBLIC_API_URL=http://localhost:4040
```

---

## Workers

### Webhook Worker

```bash
# Application
NODE_ENV=production
WORKER_TYPE=webhook

# Database
DATABASE_URL=postgresql://postgres:PASSWORD@hyrelog-us-primary.xxxxx.us-east-1.rds.amazonaws.com:5432/hyrelog?sslmode=require

# AWS (for S3 if needed)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<iam-user-access-key>
AWS_SECRET_ACCESS_KEY=<iam-user-secret-key>
```

### Job Processor Worker

```bash
# Application
NODE_ENV=production
WORKER_TYPE=jobs

# Database
DATABASE_URL=postgresql://postgres:PASSWORD@hyrelog-us-primary.xxxxx.us-east-1.rds.amazonaws.com:5432/hyrelog?sslmode=require

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<iam-user-access-key>
AWS_SECRET_ACCESS_KEY=<iam-user-secret-key>
AWS_S3_BUCKET=hyrelog-archival-us
```

### GDPR Worker

```bash
# Application
NODE_ENV=production
WORKER_TYPE=gdpr

# Database
DATABASE_URL=postgresql://postgres:PASSWORD@hyrelog-us-primary.xxxxx.us-east-1.rds.amazonaws.com:5432/hyrelog?sslmode=require

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<iam-user-access-key>
AWS_SECRET_ACCESS_KEY=<iam-user-secret-key>
AWS_S3_BUCKET=hyrelog-archival-us
```

---

## AWS Secrets Manager Structure

### Recommended Secret Naming Convention

```
hyrelog/
  ├── database/
  │   ├── us/url
  │   ├── eu/url
  │   └── au/url
  ├── api-key-secret
  ├── internal-token
  ├── aws/
  │   ├── access-key-id
  │   ├── secret-access-key
  │   └── s3-bucket
  ├── better-auth/
  │   └── secret
  ├── resend/
  │   └── api-key
  └── stripe/
      ├── secret-key
      └── webhook-secret
```

### Creating Secrets via AWS CLI

```bash
# Database URLs
aws secretsmanager create-secret \
  --name hyrelog/database/us/url \
  --secret-string "postgresql://postgres:PASSWORD@ENDPOINT:5432/hyrelog?sslmode=require" \
  --region us-east-1

# API Key Secret
aws secretsmanager create-secret \
  --name hyrelog/api-key-secret \
  --secret-string "$(openssl rand -hex 32)" \
  --region us-east-1

# Better Auth Secret
aws secretsmanager create-secret \
  --name hyrelog/better-auth/secret \
  --secret-string "$(openssl rand -hex 32)" \
  --region us-east-1

# Resend API Key
aws secretsmanager create-secret \
  --name hyrelog/resend/api-key \
  --secret-string "re_xxxxxxxxxxxxxxxxxxxxx" \
  --region us-east-1

# Stripe Secret Key
aws secretsmanager create-secret \
  --name hyrelog/stripe/secret-key \
  --secret-string "sk_live_xxxxxxxxxxxxxxxxxxxxx" \
  --region us-east-1
```

---

## Environment Variable Validation

### API Server Validation

The API server uses Zod schema validation. Ensure all required variables are set:

```typescript
// From src/config/env.ts
Required:
- NODE_ENV (development | test | production)
- DATABASE_URL (valid PostgreSQL URL)
- API_KEY_SECRET (minimum 32 characters)

Optional with defaults:
- PORT (default: 4040)
- HOST (default: 0.0.0.0)
- RATE_LIMIT_PER_KEY (default: 1200)
- RATE_LIMIT_PER_IP (default: 600)
- AWS_REGION (default: us-east-1)
```

### Dashboard Validation

Next.js will validate environment variables at build time. Ensure:

-   `DATABASE_URL` is set for Prisma
-   `BETTER_AUTH_SECRET` is set (minimum 32 characters)
-   `NEXT_PUBLIC_APP_URL` matches your deployment URL
-   Stripe keys are set if using billing features

---

## Security Best Practices

1. **Never commit secrets to Git**

    - Use `.env.example` files with placeholder values
    - Add `.env*` to `.gitignore`
    - Use AWS Secrets Manager for production

2. **Rotate secrets regularly**

    - Set up automatic rotation for database passwords
    - Rotate API keys quarterly
    - Use AWS Secrets Manager rotation

3. **Use different secrets per environment**

    - Separate dev, staging, and production secrets
    - Never reuse production secrets in development

4. **Limit secret access**

    - Use IAM roles with least privilege
    - Restrict Secrets Manager access to specific roles
    - Enable CloudTrail for secret access auditing

5. **Validate secrets at startup**
    - Application should fail fast if secrets are missing
    - Log warnings for missing optional secrets
    - Use health checks to verify secret accessibility

---

## Example .env.example Files

### API Server `.env.example`

```bash
# Copy this file to .env and fill in your values
# Never commit .env to version control

NODE_ENV=development
PORT=4040
HOST=0.0.0.0

DATABASE_URL=postgresql://postgres:password@localhost:5432/hyrelog_dev

API_KEY_SECRET=your-32-character-secret-here
INTERNAL_TOKEN=your-32-character-token-here

RATE_LIMIT_PER_KEY=1200
RATE_LIMIT_PER_IP=600
RATE_LIMIT_WINDOW_SECONDS=60

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

OTEL_SERVICE_NAME=hyrelog-api
OTEL_EXPORTER_OTLP_ENDPOINT=
```

### Dashboard `.env.example`

```bash
# Copy this file to .env.local and fill in your values
# Never commit .env.local to version control

NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres:password@localhost:5432/hyrelog_dev

BETTER_AUTH_SECRET=your-64-character-secret-here
BETTER_AUTH_URL=http://localhost:3000

RESEND_API_KEY=
RESEND_FROM_EMAIL=dev@hyrelog.local

STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_API_URL=http://localhost:4040
```
