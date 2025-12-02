import { Region, PendingWrite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrismaForRegion, getAllRegions } from "@/lib/regionClient";

/**
 * Checks if a region is healthy.
 */
export async function checkRegionHealth(region: Region): Promise<boolean> {
  try {
    const regionalPrisma = await getPrismaForRegion(region);
    await regionalPrisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Manually triggers failover for a region.
 * Queues all writes to PendingWrite table.
 */
export async function triggerFailover(region: Region): Promise<void> {
  // In production, you'd update a region status table
  // For now, we'll just log it
  console.log(`Manual failover triggered for region: ${region}`);
}

/**
 * Processes pending writes for a region after recovery.
 */
export async function processPendingWrites(region: Region): Promise<number> {
  const regionalPrisma = await getPrismaForRegion(region);
  const pendingWrites = await prisma.pendingWrite.findMany({
    where: {
      region,
    },
    orderBy: { createdAt: "asc" },
    take: 100, // Process in batches
  });

  let processed = 0;

  for (const write of pendingWrites) {
    try {
      const eventData = write.eventData as any;

      // Replay the event write
      await regionalPrisma.auditEvent.create({
        data: {
          id: eventData.id,
          companyId: eventData.companyId,
          workspaceId: eventData.workspaceId,
          projectId: eventData.projectId ?? null,
          action: eventData.action,
          category: eventData.category,
          actorId: eventData.actorId ?? null,
          actorEmail: eventData.actorEmail ?? null,
          actorName: eventData.actorName ?? null,
          targetId: eventData.targetId ?? null,
          targetType: eventData.targetType ?? null,
          payload: eventData.payload,
          metadata: eventData.metadata,
          changes: eventData.changes,
          hash: eventData.hash,
          prevHash: eventData.prevHash ?? null,
          traceId: eventData.traceId ?? null,
          dataRegion: eventData.dataRegion,
          createdAt: eventData.createdAt,
        },
      });

      // Delete the pending write
      await prisma.pendingWrite.delete({
        where: { id: write.id },
      });

      processed++;
    } catch (error) {
      console.error(`Failed to process pending write ${write.id}:`, error);
      // Continue processing other writes
    }
  }

  return processed;
}

/**
 * Queues a write to the pending writes table.
 * Used when a region is unavailable.
 */
export async function queuePendingWrite(
  companyId: string,
  region: Region,
  eventData: any,
): Promise<void> {
  await prisma.pendingWrite.create({
    data: {
      companyId,
      region,
      eventData: eventData as any,
    },
  });
}

/**
 * Checks all regions and returns health status.
 */
export async function checkAllRegionsHealth(): Promise<
  Record<Region, { healthy: boolean; latencyMs?: number }>
> {
  const regions = await getAllRegions();
  const results: Record<Region, { healthy: boolean; latencyMs?: number }> = {} as any;

  for (const region of regions) {
    const start = Date.now();
    const healthy = await checkRegionHealth(region);
    const latencyMs = Date.now() - start;

    results[region] = {
      healthy,
      latencyMs: healthy ? latencyMs : undefined,
    };
  }

  return results;
}

