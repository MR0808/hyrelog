# S3 Setup Guide for HyreLog Archival

## Overview

HyreLog uses AWS S3 to archive old audit events for companies with the `RETENTION_S3_ARCHIVE` add-on. This guide walks you through setting up S3 for archival.

## Step-by-Step Setup

### 1. Create an AWS Account (If Needed)

1. Go to [AWS Console](https://aws.amazon.com/console/)
2. Sign up or sign in to your account
3. Complete account verification if required

### 2. Create an S3 Bucket

1. **Navigate to S3**:

    - Go to AWS Console → Services → S3
    - Click "Create bucket"

2. **Configure Bucket**:

    - **Bucket name**: Choose a unique name (e.g., `hyrelog-archives-prod`)
    - **AWS Region**: Choose your preferred region (e.g., `us-east-1`)
    - **Object Ownership**: ACLs disabled (recommended)
    - **Block Public Access**: Keep all settings enabled (private bucket)
    - **Versioning**: Disable (unless you need it)
    - **Encryption**: Enable server-side encryption (recommended)
    - **Object Lock**: Disable (unless you need compliance features)

3. **Click "Create bucket"**

### 3. Create IAM User for HyreLog

1. **Navigate to IAM**:

    - Go to AWS Console → Services → IAM
    - Click "Users" → "Create user"

2. **Set User Details**:

    - **User name**: `hyrelog-archival-user`
    - **Access type**: Select "Programmatic access"

3. **Set Permissions**:
    - Click "Attach policies directly"
    - Click "Create policy"
    - Switch to JSON tab and paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket"],
            "Resource": [
                "arn:aws:s3:::YOUR-BUCKET-NAME/*",
                "arn:aws:s3:::YOUR-BUCKET-NAME"
            ]
        }
    ]
}
```

-   Replace `YOUR-BUCKET-NAME` with your actual bucket name
-   Click "Next" → Name it `HyreLogS3ArchivalPolicy`
-   Click "Create policy"
-   Go back to user creation, refresh policies, select `HyreLogS3ArchivalPolicy`
-   Click "Next" → "Create user"

4. **Save Credentials**:
    - **Access Key ID**: Copy this immediately
    - **Secret Access Key**: Copy this immediately (you won't see it again!)
    - Save these securely (password manager, `.env` file, etc.)

### 4. Configure Environment Variables

Add these to your `.env` file:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=hyrelog-archives-prod
```

**Replace with your actual values:**

-   `AWS_ACCESS_KEY_ID`: The Access Key ID from step 3
-   `AWS_SECRET_ACCESS_KEY`: The Secret Access Key from step 3
-   `AWS_REGION`: The region where you created your bucket
-   `AWS_S3_BUCKET`: Your bucket name

### 5. Test S3 Connection

Create a test script to verify S3 access:

```bash
# Create test file: test-s3.js
cat > test-s3.js << 'EOF'
import { S3Client, ListObjectsV2Command, HeadBucketCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config();

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function test() {
  const bucket = process.env.AWS_S3_BUCKET;

  if (!bucket) {
    console.error("❌ AWS_S3_BUCKET environment variable not set");
    process.exit(1);
  }

  try {
    // Test 1: Check if bucket exists and is accessible
    const headCommand = new HeadBucketCommand({ Bucket: bucket });
    await client.send(headCommand);
    console.log(`✅ Bucket "${bucket}" is accessible`);

    // Test 2: List objects in bucket (tests ListBucket permission)
    const listCommand = new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 });
    const response = await client.send(listCommand);
    console.log(`✅ S3 connection successful!`);
    console.log(`   Bucket: ${bucket}`);
    console.log(`   Objects found: ${response.KeyCount ?? 0}`);

    if (response.Contents && response.Contents.length > 0) {
      console.log(`   Sample object: ${response.Contents[0]?.Key}`);
    }
  } catch (error) {
    console.error("❌ S3 connection failed:", error.message);
    console.error("\nTroubleshooting:");
    console.error("1. Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are correct");
    console.error("2. Check IAM user has s3:ListBucket permission for the bucket");
    console.error("3. Verify AWS_S3_BUCKET matches your bucket name");
    console.error("4. Ensure AWS_REGION matches your bucket region");
    process.exit(1);
  }
}

test();
EOF

# Run test
node test-s3.js
```

**Note**: This test uses `HeadBucketCommand` and `ListObjectsV2Command` which only require permissions for your specific bucket, not `s3:ListAllMyBuckets` which lists all buckets in your account.

### 6. Verify Archival Works

1. **Enable S3 Archival Add-On**:

    - Assign the `RETENTION_S3_ARCHIVE` add-on to a test company
    - Or run the seed script which includes this

2. **Trigger Archival**:

    - Wait for the nightly archival cron job (runs at 4 AM)
    - Or manually trigger: `npx tsx src/crons/archivalJob.ts`

3. **Check S3**:
    - Go to AWS Console → S3 → Your bucket
    - You should see folders like: `{companyId}/{workspaceId}/2024-12-01.json.gz`

### 7. Set Up Bucket Lifecycle Policies (Optional)

To automatically delete old archives after a certain period:

1. Go to your S3 bucket → Management → Lifecycle rules
2. Click "Create lifecycle rule"
3. Configure:
    - **Rule name**: `delete-old-archives`
    - **Rule scope**: Apply to all objects
    - **Actions**: Expire current versions of objects
    - **Days**: 3650 (10 years) or your retention period
4. Save

## Security Best Practices

1. **Never commit credentials**: Keep `.env` in `.gitignore`
2. **Use IAM roles in production**: For AWS deployments, use IAM roles instead of access keys
3. **Rotate keys regularly**: Change access keys every 90 days
4. **Limit permissions**: Only grant S3 PutObject, GetObject, ListBucket
5. **Enable encryption**: Use S3 server-side encryption
6. **Monitor access**: Enable CloudTrail for S3 access logging

## Troubleshooting

**Error: "Access Denied"**

-   Check IAM user permissions
-   Verify bucket name is correct
-   Ensure access key and secret are correct

**Error: "Bucket does not exist"**

-   Verify bucket name in `AWS_S3_BUCKET`
-   Check region matches bucket region

**Error: "Invalid credentials"**

-   Regenerate access keys in IAM
-   Update `.env` file
-   Restart your application

**Archival not working**

-   Check cron job logs
-   Verify company has `RETENTION_S3_ARCHIVE` add-on
-   Ensure events are marked `archivalCandidate=true`

## Cost Estimation

S3 storage costs (as of 2024):

-   **Standard storage**: ~$0.023 per GB/month
-   **PUT requests**: $0.005 per 1,000 requests
-   **GET requests**: $0.0004 per 1,000 requests

Example: 1M events (~500MB compressed) = ~$0.01/month storage

## Alternative: Use S3-Compatible Services

You can use S3-compatible services like:

-   **DigitalOcean Spaces**
-   **Backblaze B2**
-   **MinIO** (self-hosted)

Just use the same environment variables and configure the endpoint:

```bash
AWS_ENDPOINT=https://nyc3.digitaloceanspaces.com
```
