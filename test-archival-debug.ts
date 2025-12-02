/**
 * Debug script to test S3 connection and archival process
 * Run with: npx tsx test-archival-debug.ts
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./src/config/env";
import { getS3Client, uploadToS3, generateArchiveKey } from "./src/lib/s3";
import { hasS3ArchivalAddOn, archiveEvents } from "./src/lib/archival";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testS3Connection() {
  console.log("=".repeat(60));
  console.log("🔍 Testing S3 Connection");
  console.log("=".repeat(60));

  console.log("\n📋 S3 Configuration:");
  console.log(`   AWS_REGION: ${env.AWS_REGION ?? "NOT SET"}`);
  console.log(`   AWS_ACCESS_KEY_ID: ${env.AWS_ACCESS_KEY_ID ? "✅ SET" : "❌ NOT SET"}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${env.AWS_SECRET_ACCESS_KEY ? "✅ SET" : "❌ NOT SET"}`);
  console.log(`   AWS_S3_BUCKET: ${env.AWS_S3_BUCKET ?? "❌ NOT SET"}`);

  const client = getS3Client();
  if (!client) {
    console.log("\n❌ S3 client is null - check environment variables!");
    return false;
  }

  console.log("\n✅ S3 client created successfully");

  // Test upload
  try {
    const testKey = `test/connection-test-${Date.now()}.json`;
    const testData = JSON.stringify({ test: true, timestamp: new Date().toISOString() });
    
    console.log(`\n📤 Testing upload to: ${testKey}`);
    await uploadToS3(testKey, Buffer.from(testData), "application/json");
    console.log("✅ Test upload successful!");
    return true;
  } catch (error) {
    console.error("\n❌ Test upload failed:", error);
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      if ("$metadata" in error) {
        console.error(`   Status: ${(error as any).$metadata?.httpStatusCode}`);
      }
    }
    return false;
  }
}

async function checkDatabaseState() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 Checking Database State");
  console.log("=".repeat(60));

  // Check companies
  const companies = await prisma.company.findMany({
    include: {
      plans: {
        include: {
          plan: true,
        },
      },
    },
  });

  console.log(`\n📊 Found ${companies.length} companies:`);
  for (const company of companies) {
    const hasAddOn = await hasS3ArchivalAddOn(company.id);
    console.log(`\n   Company: ${company.name} (${company.id})`);
    console.log(`   - Retention Days: ${company.retentionDays}`);
    console.log(`   - S3 Archival Add-on: ${hasAddOn ? "✅ YES" : "❌ NO"}`);

    // Check events
    const totalEvents = await prisma.auditEvent.count({
      where: { companyId: company.id },
    });

    const archivedEvents = await prisma.auditEvent.count({
      where: {
        companyId: company.id,
        archived: true,
      },
    });

    const archivalCandidates = await prisma.auditEvent.count({
      where: {
        companyId: company.id,
        archived: false,
        archivalCandidate: true,
      },
    });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - company.retentionDays);

    const readyForArchival = await prisma.auditEvent.count({
      where: {
        companyId: company.id,
        archived: false,
        archivalCandidate: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`   - Total Events: ${totalEvents}`);
    console.log(`   - Already Archived: ${archivedEvents}`);
    console.log(`   - Archival Candidates: ${archivalCandidates}`);
    console.log(`   - Ready for Archival (older than ${company.retentionDays} days): ${readyForArchival}`);
    console.log(`   - Cutoff Date: ${cutoffDate.toISOString()}`);

    // Show sample events
    if (readyForArchival > 0) {
      const sampleEvents = await prisma.auditEvent.findMany({
        where: {
          companyId: company.id,
          archived: false,
          archivalCandidate: true,
          createdAt: {
            lt: cutoffDate,
          },
        },
        take: 3,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          createdAt: true,
          workspaceId: true,
          action: true,
        },
      });

      console.log(`\n   📝 Sample events ready for archival:`);
      for (const event of sampleEvents) {
        const daysOld = Math.floor((Date.now() - event.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`      - ${event.id.slice(0, 8)}... | ${event.createdAt.toISOString().split("T")[0]} | ${daysOld} days old | ${event.action}`);
      }
    }
  }
}

async function testArchivalProcess() {
  console.log("\n" + "=".repeat(60));
  console.log("🔍 Testing Archival Process");
  console.log("=".repeat(60));

  const companies = await prisma.company.findMany();

  for (const company of companies) {
    const hasAddOn = await hasS3ArchivalAddOn(company.id);
    if (!hasAddOn) {
      console.log(`\n⏭️  Skipping ${company.name} - no S3 archival add-on`);
      continue;
    }

    console.log(`\n🏢 Processing ${company.name}...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - company.retentionDays);

    const events = await prisma.auditEvent.findMany({
      where: {
        companyId: company.id,
        archived: false,
        archivalCandidate: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
      take: 5, // Just test with first 5
      orderBy: { createdAt: "asc" },
    });

    if (events.length === 0) {
      console.log(`   ⚠️  No events ready for archival`);
      continue;
    }

    console.log(`   Found ${events.length} events to test with`);

    // Group by workspace and date
    const workspaceGroups = new Map<string, Map<string, typeof events>>();

    for (const event of events) {
      if (!workspaceGroups.has(event.workspaceId)) {
        workspaceGroups.set(event.workspaceId, new Map());
      }

      const dateMap = workspaceGroups.get(event.workspaceId)!;
      const date = new Date(event.createdAt);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0]!;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(event);
    }

    console.log(`   Grouped into ${workspaceGroups.size} workspace(s)`);

    // Try uploading one group
    for (const [workspaceId, dateGroups] of workspaceGroups) {
      for (const [dateKey, dateEvents] of dateGroups) {
        const date = new Date(dateKey);
        const key = generateArchiveKey(company.id, workspaceId, date);

        console.log(`\n   📤 Testing upload:`);
        console.log(`      Key: ${key}`);
        console.log(`      Events: ${dateEvents.length}`);
        console.log(`      Date: ${dateKey}`);

        try {
          const { gzip } = await import("node:zlib");
          const { promisify } = await import("node:util");
          const gzipAsync = promisify(gzip);

          const jsonData = JSON.stringify(dateEvents, null, 2);
          const compressed = await gzipAsync(Buffer.from(jsonData));

          console.log(`      JSON size: ${jsonData.length} bytes`);
          console.log(`      Compressed size: ${compressed.length} bytes`);

          await uploadToS3(key, compressed, "application/json");
          console.log(`   ✅ Upload successful!`);

          // Verify we can read it back
          const { GetObjectCommand } = await import("@aws-sdk/client-s3");
          const client = getS3Client();
          if (client) {
            const response = await client.send(
              new GetObjectCommand({
                Bucket: env.AWS_S3_BUCKET,
                Key: key,
              })
            );
            console.log(`   ✅ Verified file exists in S3 (ETag: ${response.ETag})`);
          }

          return true; // Success!
        } catch (error) {
          console.error(`   ❌ Upload failed:`, error);
          if (error instanceof Error) {
            console.error(`      Error: ${error.message}`);
            if ("$metadata" in error) {
              console.error(`      Status: ${(error as any).$metadata?.httpStatusCode}`);
            }
          }
          return false;
        }
      }
    }
  }

  return false;
}

async function main() {
  try {
    console.log("🚀 Starting Archival Debug Script\n");

    // Step 1: Test S3 connection
    const s3Connected = await testS3Connection();
    if (!s3Connected) {
      console.log("\n❌ S3 connection test failed. Please check your configuration.");
      process.exit(1);
    }

    // Step 2: Check database state
    await checkDatabaseState();

    // Step 3: Test archival process
    const archivalWorks = await testArchivalProcess();
    if (!archivalWorks) {
      console.log("\n⚠️  Archival test did not process any events. Check database state above.");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Debug Complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      console.error(`   ${error.stack}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

