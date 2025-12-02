/**
 * Verify archived files exist in S3.
 * 
 * Usage: npx tsx scripts/verify-s3-archives.ts
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { env } from "@/config/env";
import { generateArchiveKey } from "@/lib/s3";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function main() {
  console.log("🔍 Verifying S3 Archives\n");
  console.log("=".repeat(60));

  if (!env.AWS_S3_BUCKET) {
    console.error("❌ AWS_S3_BUCKET not configured");
    process.exit(1);
  }

  // Find companies with archived events
  const companies = await prisma.company.findMany({
    where: {
      auditEvents: {
        some: {
          archived: true,
        },
      },
    },
    include: {
      workspaces: true,
    },
  });

  if (companies.length === 0) {
    console.log("❌ No companies with archived events found");
    console.log("   Run: npx tsx scripts/test-archival.ts");
    console.log("   Then: npx tsx src/crons/archivalJob.ts");
    process.exit(0);
  }

  console.log(`\nFound ${companies.length} company(ies) with archived events\n`);

  for (const company of companies) {
    console.log(`Company: ${company.name} (${company.id})`);
    console.log(`Bucket: ${env.AWS_S3_BUCKET}\n`);

    // Get archived events grouped by workspace and date
    const archivedEvents = await prisma.auditEvent.findMany({
      where: {
        companyId: company.id,
        archived: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (archivedEvents.length === 0) {
      console.log("  ⚠️  No archived events in database\n");
      continue;
    }

    // Group by workspace and date
    const expectedFiles = new Map<string, Set<string>>();

    for (const event of archivedEvents) {
      const date = new Date(event.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = generateArchiveKey(company.id, event.workspaceId, date);

      if (!expectedFiles.has(event.workspaceId)) {
        expectedFiles.set(event.workspaceId, new Set());
      }
      expectedFiles.get(event.workspaceId)!.add(key);
    }

    console.log(`  Expected ${archivedEvents.length} archived events`);
    console.log(`  Expected ${Array.from(expectedFiles.values()).reduce((sum, set) => sum + set.size, 0)} files\n`);

    // List files in S3
    const prefix = `${company.id}/`;
    console.log(`  Listing S3 objects with prefix: ${prefix}`);

    try {
      const command = new ListObjectsV2Command({
        Bucket: env.AWS_S3_BUCKET,
        Prefix: prefix,
      });

      const response = await s3Client.send(command);
      const s3Files = response.Contents?.map((obj) => obj.Key!) ?? [];

      console.log(`  ✅ Found ${s3Files.length} files in S3\n`);

      if (s3Files.length === 0) {
        console.log("  ⚠️  No files found in S3!");
        console.log("     Check:");
        console.log("     1. Bucket name is correct");
        console.log("     2. IAM user has s3:PutObject permission");
        console.log("     3. Files were uploaded successfully\n");
        continue;
      }

      // Show files by workspace
      for (const [workspaceId, expectedKeys] of expectedFiles) {
        const workspace = company.workspaces.find((w) => w.id === workspaceId);
        console.log(`  Workspace: ${workspace?.name ?? workspaceId}`);

        const workspaceFiles = s3Files.filter((key) => key.startsWith(`${company.id}/${workspaceId}/`));
        console.log(`    Files in S3: ${workspaceFiles.length}`);

        for (const expectedKey of expectedKeys) {
          const exists = s3Files.includes(expectedKey);
          if (exists) {
            console.log(`    ✅ ${expectedKey}`);
          } else {
            console.log(`    ❌ ${expectedKey} (MISSING)`);
          }
        }
        console.log();
      }

      // Show all S3 files for this company
      console.log("  All S3 files for this company:");
      for (const file of s3Files) {
        const size = response.Contents?.find((obj) => obj.Key === file)?.Size ?? 0;
        console.log(`    📄 ${file} (${(size / 1024).toFixed(2)} KB)`);
      }
    } catch (error) {
      console.error(`  ❌ Error listing S3 objects:`, error);
      if (error instanceof Error) {
        console.error(`     ${error.message}`);
      }
    }

    console.log();
  }

  console.log("=".repeat(60));
  console.log("\n💡 To view files in AWS Console:");
  console.log(`   https://s3.console.aws.amazon.com/s3/buckets/${env.AWS_S3_BUCKET}?region=${env.AWS_REGION}`);
  console.log();
}

main()
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

