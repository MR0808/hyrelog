import { z } from "zod";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getS3Client, uploadToS3, generateArchiveKey } from "@/lib/s3";

const gzipAsync = promisify(gzip);

export type ArchivalConfig = {
  companyId: string;
  effectiveRetentionDays: number;
  removePayloadFromDb?: boolean;
};

/**
 * Groups events by date for archival.
 */
export const groupEventsByDate = (events: Array<{ createdAt: Date }>) => {
  const groups = new Map<string, typeof events>();

  for (const event of events) {
    const date = new Date(event.createdAt);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString().split("T")[0]!;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(event);
  }

  return groups;
};

/**
 * Archives events older than retention window to S3.
 */
export const archiveEvents = async (config: ArchivalConfig): Promise<number> => {
  const client = getS3Client();
  if (!client) {
    throw new Error("S3 not configured");
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.effectiveRetentionDays);

  // Fetch events to archive
  const events = await prisma.auditEvent.findMany({
    where: {
      companyId: config.companyId,
      archived: false,
      archivalCandidate: true,
      createdAt: {
        lt: cutoffDate,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (events.length === 0) {
    return 0;
  }

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

  let archivedCount = 0;

  // Upload each group to S3
  for (const [workspaceId, dateGroups] of workspaceGroups) {
    for (const [dateKey, dateEvents] of dateGroups) {
      const date = new Date(dateKey);
      const key = generateArchiveKey(config.companyId, workspaceId, date);

      console.log(`  📤 Uploading to S3: ${key} (${dateEvents.length} events)`);

      try {
        const jsonData = JSON.stringify(dateEvents, null, 2);
        const compressed = await gzipAsync(Buffer.from(jsonData));

        await uploadToS3(key, compressed, "application/json");
        console.log(`  ✅ Uploaded successfully`);

        // Mark events as archived
        const eventIds = dateEvents.map((e) => e.id);
        await prisma.auditEvent.updateMany({
          where: {
            id: {
              in: eventIds,
            },
          },
          data: {
            archived: true,
            ...(config.removePayloadFromDb
              ? {
                  payload: Prisma.JsonNull,
                }
              : {}),
          },
        });

        archivedCount += eventIds.length;
        console.log(`  ✅ Marked ${eventIds.length} events as archived`);
      } catch (error) {
        console.error(`  ❌ Failed to upload ${key}:`, error);
        if (error instanceof Error) {
          console.error(`     Error: ${error.message}`);
        }
        throw error; // Re-throw to stop processing
      }
    }
  }

  return archivedCount;
};

/**
 * Checks if company has S3 archival add-on.
 */
export const hasS3ArchivalAddOn = async (companyId: string): Promise<boolean> => {
  const addOn = await prisma.companyAddOn.findFirst({
    where: {
      companyId,
      addOn: {
        code: "RETENTION_S3_ARCHIVE",
      },
    },
  });

  return addOn !== null;
};

