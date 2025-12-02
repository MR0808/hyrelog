/**
 * Cleanup script to remove all archived files from S3
 * Run with: npx tsx scripts/cleanup-s3.ts
 * 
 * WARNING: This will delete ALL files in the S3 bucket!
 * 
 * NOTE: The archival IAM user typically only has PutObject/GetObject permissions,
 * not DeleteObject. If this script fails with permission errors, use one of these alternatives:
 * 
 * Option 1: AWS Console
 *   - Go to S3 Console → Your bucket → Select files → Delete
 * 
 * Option 2: AWS CLI (with admin credentials)
 *   aws s3 rm s3://your-bucket-name/ --recursive
 * 
 * Option 3: Use different AWS credentials with delete permissions
 *   Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to admin credentials temporarily
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { env } from "../src/config/env";

async function cleanupS3() {
  console.log("🧹 Starting S3 cleanup...\n");

  const client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  if (!env.AWS_S3_BUCKET) {
    console.error("❌ AWS_S3_BUCKET not set in environment");
    process.exit(1);
  }

  console.log(`📦 Bucket: ${env.AWS_S3_BUCKET}`);
  console.log(`⚠️  This will delete ALL files in the bucket!`);
  console.log(`\n💡 Note: If you get permission errors, the archival IAM user`);
  console.log(`   doesn't have delete permissions (this is correct for security).`);
  console.log(`   Use AWS Console or AWS CLI with admin credentials instead.\n`);

  let totalDeleted = 0;
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: env.AWS_S3_BUCKET,
      ContinuationToken: continuationToken,
    });

    const listResponse = await client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log("✅ No files found in bucket");
      break;
    }

    const objectsToDelete = listResponse.Contents.map((obj) => ({
      Key: obj.Key!,
    }));

    console.log(`🗑️  Deleting ${objectsToDelete.length} files...`);

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: env.AWS_S3_BUCKET,
      Delete: {
        Objects: objectsToDelete,
        Quiet: false,
      },
    });

    const deleteResponse = await client.send(deleteCommand);

    if (deleteResponse.Deleted) {
      totalDeleted += deleteResponse.Deleted.length;
      console.log(`   ✅ Deleted ${deleteResponse.Deleted.length} files`);
    }

    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      console.error("   ❌ Errors:");
      const hasPermissionError = deleteResponse.Errors.some(
        (e) => e.Message?.includes("not authorized") || e.Message?.includes("Access Denied")
      );
      
      if (hasPermissionError) {
        console.error("\n   ⚠️  Permission denied - IAM user doesn't have s3:DeleteObject permission");
        console.error("   This is expected! The archival user should only have PutObject/GetObject.");
        console.error("\n   💡 Alternatives:");
        console.error("   1. Use AWS Console: S3 → Bucket → Select files → Delete");
        console.error("   2. Use AWS CLI: aws s3 rm s3://your-bucket-name/ --recursive");
        console.error("   3. Temporarily use admin credentials in .env");
      } else {
        for (const error of deleteResponse.Errors) {
          console.error(`      - ${error.Key}: ${error.Message}`);
        }
      }
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} files total`);
}

cleanupS3().catch((error) => {
  console.error("❌ Cleanup failed:", error);
  process.exit(1);
});

