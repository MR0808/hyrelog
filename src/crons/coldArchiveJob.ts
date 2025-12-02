import { prisma } from "@/lib/prisma";
import { runCronPerRegion } from "@/lib/regionCron";
import { getPrismaForRegion, getAllRegions } from "@/lib/regionClient";
import { archiveToColdStorage, isColdStorageConfigured } from "@/lib/coldStorage";
import { generateArchiveKey } from "@/lib/s3";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import type { Region } from "@prisma/client";

const gzipAsync = promisify(gzip);

/**
 * Moves old S3 archived events to cold storage.
 * Runs weekly.
 */
export const runColdArchiveJob = async (): Promise<void> => {
  console.log("❄️  Starting cold archive job...\n");

  await runCronPerRegion(async (region: Region) => {
    console.log(`Processing region: ${region}`);

    const hasColdStorage = await isColdStorageConfigured(region);
    if (!hasColdStorage) {
      console.log(`  ⏭️  Skipping - cold storage not configured`);
      return;
    }

    const regionalPrisma = await getPrismaForRegion(region);

    // Find events that are warm archived but not cold archived
    // Typically, events older than 1 year in warm storage move to cold storage
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

    const eventsToArchive = await regionalPrisma.auditEvent.findMany({
      where: {
        isWarmArchived: true,
        isColdArchived: false,
        createdAt: {
          lt: cutoffDate,
        },
      },
      take: 1000, // Process in batches
      orderBy: { createdAt: "asc" },
    });

    if (eventsToArchive.length === 0) {
      console.log(`  ✅ No events to archive`);
      return;
    }

    console.log(`  Found ${eventsToArchive.length} events to archive`);

    // Group by company/workspace/date for efficient archiving
    const groups = new Map<string, typeof eventsToArchive>();

    for (const event of eventsToArchive) {
      const date = new Date(event.createdAt);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0]!;
      const groupKey = `${event.companyId}/${event.workspaceId}/${dateKey}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(event);
    }

    let archived = 0;

    for (const [groupKey, groupEvents] of groups) {
      try {
        // Serialize events
        const jsonData = JSON.stringify(groupEvents);
        const compressed = await gzipAsync(Buffer.from(jsonData));

        // Archive to cold storage
        const archiveKey = await archiveToColdStorage(region, `${groupKey}.json.gz`, compressed);

        // Update events
        await regionalPrisma.auditEvent.updateMany({
          where: {
            id: {
              in: groupEvents.map((e) => e.id),
            },
          },
          data: {
            isColdArchived: true,
            coldArchiveKey: archiveKey,
          },
        });

        archived += groupEvents.length;
        console.log(`  ✅ Archived ${groupEvents.length} events to cold storage (${groupKey})`);
      } catch (error) {
        console.error(`  ❌ Failed to archive group ${groupKey}:`, error);
      }
    }

    console.log(`  ✅ Archived ${archived} events total`);
  });

  console.log("\n✅ Cold archive job completed");
};

