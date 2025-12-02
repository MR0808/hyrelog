/**
 * Diagnostic script to check why archival isn't working.
 * 
 * Usage: npx tsx scripts/diagnose-archival.ts
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@/config/env";
import { getS3Client } from "@/lib/s3";
import { hasS3ArchivalAddOn } from "@/lib/archival";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔍 Archival Diagnostic Tool\n");
  console.log("=".repeat(60));

  // Check S3 configuration
  console.log("\n1️⃣  S3 Configuration:");
  const s3Client = getS3Client();
  if (!s3Client) {
    console.log("  ❌ S3 not configured");
    console.log("     Missing environment variables:");
    if (!env.AWS_ACCESS_KEY_ID) console.log("       - AWS_ACCESS_KEY_ID");
    if (!env.AWS_SECRET_ACCESS_KEY) console.log("       - AWS_SECRET_ACCESS_KEY");
    if (!env.AWS_S3_BUCKET) console.log("       - AWS_S3_BUCKET");
    console.log("     AWS_REGION:", env.AWS_REGION || "not set");
  } else {
    console.log("  ✅ S3 client initialized");
    console.log("     Bucket:", env.AWS_S3_BUCKET);
    console.log("     Region:", env.AWS_REGION);
  }

  // Check companies with add-on
  console.log("\n2️⃣  Companies with S3 Archival Add-On:");
  const companies = await prisma.company.findMany({
    include: {
      addOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  const companiesWithAddOn = companies.filter((c) =>
    c.addOns.some((ao) => ao.addOn.code === "RETENTION_S3_ARCHIVE"),
  );

  if (companiesWithAddOn.length === 0) {
    console.log("  ❌ No companies found with S3 archival add-on");
    console.log("     Run: npm run seed");
  } else {
    console.log(`  ✅ Found ${companiesWithAddOn.length} company(ies) with add-on:`);
    for (const company of companiesWithAddOn) {
      console.log(`     - ${company.name} (${company.id})`);
      console.log(`       Retention days: ${company.retentionDays}`);

      // Check events ready for archival
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - company.retentionDays);

      const readyCount = await prisma.auditEvent.count({
        where: {
          companyId: company.id,
          archived: false,
          archivalCandidate: true,
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      const candidateCount = await prisma.auditEvent.count({
        where: {
          companyId: company.id,
          archived: false,
          archivalCandidate: true,
        },
      });

      const oldCount = await prisma.auditEvent.count({
        where: {
          companyId: company.id,
          archived: false,
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`       Events older than retention: ${oldCount}`);
      console.log(`       Events marked as candidates: ${candidateCount}`);
      console.log(`       Events ready for archival: ${readyCount}`);
      console.log(`       Cutoff date: ${cutoffDate.toISOString()}`);

      if (readyCount === 0 && candidateCount > 0) {
        console.log(`       ⚠️  ${candidateCount} candidates exist but are not old enough`);
        const oldestCandidate = await prisma.auditEvent.findFirst({
          where: {
            companyId: company.id,
            archivalCandidate: true,
            archived: false,
          },
          orderBy: {
            createdAt: "asc",
          },
        });
        if (oldestCandidate) {
          const daysOld = Math.floor(
            (Date.now() - oldestCandidate.createdAt.getTime()) / (1000 * 60 * 60 * 24),
          );
          console.log(`       Oldest candidate is ${daysOld} days old (need ${company.retentionDays} days)`);
        }
      }

      if (readyCount === 0 && oldCount > 0 && candidateCount === 0) {
        console.log(`       ⚠️  ${oldCount} old events exist but not marked as candidates`);
        console.log(`       Run: npx tsx src/crons/retentionMarking.ts`);
      }
    }
  }

  // Check archived events
  console.log("\n3️⃣  Already Archived Events:");
  const archivedCount = await prisma.auditEvent.count({
    where: {
      archived: true,
    },
  });
  console.log(`  Total archived: ${archivedCount}`);

  if (archivedCount > 0) {
    const sampleArchived = await prisma.auditEvent.findFirst({
      where: {
        archived: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (sampleArchived) {
      console.log(`  Most recent archived: ${sampleArchived.createdAt.toISOString()}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💡 Recommendations:");

  if (!s3Client) {
    console.log("  1. Configure S3 credentials in .env file");
  }

  if (companiesWithAddOn.length === 0) {
    console.log("  1. Run seed script: npm run seed");
  } else {
    const company = companiesWithAddOn[0]!;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - company.retentionDays);

    const readyCount = await prisma.auditEvent.count({
      where: {
        companyId: company.id,
        archived: false,
        archivalCandidate: true,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (readyCount === 0) {
      console.log("  1. Create old events: npx tsx scripts/test-archival.ts");
      console.log("  2. Or mark existing events: npx tsx src/crons/retentionMarking.ts");
    } else {
      console.log(`  1. Run archival job: npx tsx src/crons/archivalJob.ts`);
      console.log(`     (${readyCount} events ready)`);
    }
  }

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

