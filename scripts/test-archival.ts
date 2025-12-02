/**
 * Test script to prepare events for archival testing.
 * 
 * This script:
 * 1. Creates old events (beyond retention window)
 * 2. Marks them as archival candidates
 * 3. Verifies they're ready for archival
 * 
 * Usage: tsx scripts/test-archival.ts
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, DataRegion } from "@prisma/client";
import { computeEventHash } from "@/lib/hashchain";
import { env } from "@/config/env";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🧪 Preparing events for archival testing...\n");

  // Find a company with S3 archival add-on
  const company = await prisma.company.findFirst({
    where: {
      addOns: {
        some: {
          addOn: {
            code: "RETENTION_S3_ARCHIVE",
          },
        },
      },
    },
    include: {
      workspaces: true,
      plans: true,
    },
  });

  if (!company) {
    console.error("❌ No company found with S3 archival add-on");
    console.log("\n💡 Tip: Run the seed script first: npm run seed");
    process.exit(1);
  }

  console.log(`✅ Found company: ${company.name} (${company.slug})`);
  console.log(`   Retention days: ${company.retentionDays}`);
  console.log(`   Workspaces: ${company.workspaces.length}\n`);

  // Calculate cutoff date (events older than this will be archived)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - company.retentionDays - 1); // 1 day older than retention

  console.log(`📅 Creating events older than retention window...`);
  console.log(`   Cutoff date: ${cutoffDate.toISOString()}\n`);

  const workspace = company.workspaces[0];
  if (!workspace) {
    console.error("❌ Company has no workspaces");
    process.exit(1);
  }

  // Create old events
  const eventsToCreate = 10;
  const workspaceHashMap = new Map<string, string | null>();
  workspaceHashMap.set(workspace.id, null);

  const createdEvents = [];

  for (let i = 0; i < eventsToCreate; i++) {
    const createdAt = new Date(cutoffDate.getTime() - i * 24 * 60 * 60 * 1000); // Spread over days
    const prevHash = workspaceHashMap.get(workspace.id) ?? null;

    const hash = computeEventHash(
      {
        workspaceId: workspace.id,
        companyId: company.id,
        projectId: null,
        action: `test.archival.${i}`,
        category: "test",
        payload: { test: true, index: i },
        metadata: { source: "archival-test" },
        actorId: `test-actor-${i}`,
        actorEmail: `test${i}@example.com`,
        actorName: `Test Actor ${i}`,
        createdAt,
      },
      prevHash,
    );

    const event = await prisma.auditEvent.create({
      data: {
        companyId: company.id,
        workspaceId: workspace.id,
        action: `test.archival.${i}`,
        category: "test",
        payload: { test: true, index: i },
        metadata: { source: "archival-test" },
        actorId: `test-actor-${i}`,
        actorEmail: `test${i}@example.com`,
        actorName: `Test Actor ${i}`,
        hash,
        prevHash,
        traceId: `trace-archival-${i}`,
        dataRegion: company.dataRegion ?? DataRegion.US,
        createdAt,
        archivalCandidate: false, // Will be marked by retention marking job
      },
    });

    createdEvents.push(event);
    workspaceHashMap.set(workspace.id, hash);
  }

  console.log(`✅ Created ${createdEvents.length} old events\n`);

  // Mark events as archival candidates (simulating retention marking job)
  console.log("🏷️  Marking events as archival candidates...");

  const marked = await prisma.auditEvent.updateMany({
    where: {
      companyId: company.id,
      workspaceId: workspace.id,
      createdAt: {
        lt: cutoffDate,
      },
      archived: false,
      archivalCandidate: false,
    },
    data: {
      archivalCandidate: true,
    },
  });

  console.log(`✅ Marked ${marked.count} events as archival candidates\n`);

  // Verify events are ready for archival
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

  console.log("📊 Summary:");
  console.log(`   Company: ${company.name}`);
  console.log(`   Workspace: ${workspace.name}`);
  console.log(`   Events ready for archival: ${readyForArchival}`);
  console.log(`   Retention window: ${company.retentionDays} days`);
  console.log(`   Cutoff date: ${cutoffDate.toISOString()}\n`);

  console.log("🚀 Next steps:");
  console.log("   1. Run archival job: tsx src/crons/archivalJob.ts");
  console.log("   2. Check S3 bucket for archived files");
  console.log("   3. Verify events are marked as archived=true in database\n");
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

