import { prisma } from "@/lib/prisma";
import { archiveEvents, hasS3ArchivalAddOn } from "@/lib/archival";
import { getRetentionWindowStart } from "@/lib/retention";
/**
 * Archives events to S3 for companies with RETENTION_S3_ARCHIVE add-on.
 * Runs nightly.
 */
export const runArchivalJob = async () => {
    console.log("🔍 Starting archival job...\n");
    // Check S3 configuration first
    const { getS3Client } = await import("@/lib/s3");
    const s3Client = getS3Client();
    if (!s3Client) {
        console.error("❌ S3 client is null - check environment variables!");
        console.error("   Required: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET");
        return;
    }
    console.log("✅ S3 client initialized\n");
    const companies = await prisma.company.findMany({
        include: {
            plans: {
                include: {
                    plan: true,
                },
            },
        },
    });
    console.log(`Found ${companies.length} companies\n`);
    if (companies.length === 0) {
        console.log("⚠️  No companies found in database. Run seed script first.");
        return;
    }
    for (const company of companies) {
        console.log(`Checking company: ${company.name} (${company.id})`);
        const hasAddOn = await hasS3ArchivalAddOn(company.id);
        if (!hasAddOn) {
            console.log(`  ⏭️  Skipping - no S3 archival add-on\n`);
            continue;
        }
        console.log(`  ✅ Has S3 archival add-on`);
        const retention = getRetentionWindowStart({ company });
        const effectiveRetentionDays = company.retentionDays;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - effectiveRetentionDays);
        console.log(`  Retention days: ${effectiveRetentionDays}`);
        console.log(`  Cutoff date: ${cutoffDate.toISOString()}`);
        // Check total archival candidates first
        const totalCandidates = await prisma.auditEvent.count({
            where: {
                companyId: company.id,
                archived: false,
                archivalCandidate: true,
            },
        });
        console.log(`  Total archival candidates: ${totalCandidates}`);
        // Check how many events are ready (older than cutoff)
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
        console.log(`  Events ready for archival (older than ${effectiveRetentionDays} days): ${readyCount}`);
        if (readyCount === 0) {
            if (totalCandidates > 0) {
                console.log(`  ⚠️  Found ${totalCandidates} candidates but none are old enough yet`);
                // Show sample dates
                const sample = await prisma.auditEvent.findFirst({
                    where: {
                        companyId: company.id,
                        archived: false,
                        archivalCandidate: true,
                    },
                    orderBy: { createdAt: "asc" },
                    select: { createdAt: true },
                });
                if (sample) {
                    const daysOld = Math.floor((Date.now() - sample.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                    console.log(`  📅 Oldest candidate is ${daysOld} days old (needs ${effectiveRetentionDays} days)`);
                }
            }
            console.log(`  ⏭️  No events to archive\n`);
            continue;
        }
        try {
            console.log(`  🚀 Starting archival process...`);
            const archivedCount = await archiveEvents({
                companyId: company.id,
                effectiveRetentionDays,
                removePayloadFromDb: false, // Keep payload in DB by default
            });
            console.log(`  ✅ Successfully archived ${archivedCount} events\n`);
        }
        catch (error) {
            console.error(`  ❌ Failed to archive events:`, error);
            if (error instanceof Error) {
                console.error(`     Error message: ${error.message}`);
                console.error(`     Stack: ${error.stack}`);
            }
            console.log();
        }
    }
    console.log("✅ Archival job completed");
};
// Run if executed directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.includes("archivalJob")) {
    runArchivalJob()
        .then(() => {
        console.log("\n✅ Done");
        process.exit(0);
    })
        .catch((error) => {
        console.error("\n❌ Fatal error:", error);
        process.exit(1);
    });
}
//# sourceMappingURL=archivalJob.js.map