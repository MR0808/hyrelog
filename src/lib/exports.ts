import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getRetentionWindowStart } from "@/lib/retention";
import type { Company, Workspace } from "@prisma/client";

export const exportLimitSchema = z.object({
  free: z.number().default(10_000),
  starter: z.number().default(50_000),
  growth: z.number().default(250_000),
  scale: z.number().default(1_000_000),
  enterprise: z.number().default(Number.MAX_SAFE_INTEGER),
});

export type ExportLimits = z.infer<typeof exportLimitSchema>;

export const EXPORT_LIMITS: ExportLimits = {
  free: 10_000,
  starter: 50_000,
  growth: 250_000,
  scale: 1_000_000,
  enterprise: Number.MAX_SAFE_INTEGER,
};

/**
 * Gets export limit for a company based on plan.
 */
export const getExportLimit = async (companyId: string): Promise<number> => {
  const companyPlan = await prisma.companyPlan.findUnique({
    where: { companyId },
    include: { plan: true },
  });

  if (!companyPlan) {
    return EXPORT_LIMITS.free;
  }

  const planCode = companyPlan.plan.code.toLowerCase();
  if (planCode.includes("enterprise")) {
    return EXPORT_LIMITS.enterprise;
  }
  if (planCode.includes("scale")) {
    return EXPORT_LIMITS.scale;
  }
  if (planCode.includes("growth")) {
    return EXPORT_LIMITS.growth;
  }
  if (planCode.includes("starter")) {
    return EXPORT_LIMITS.starter;
  }

  return EXPORT_LIMITS.free;
};

/**
 * Builds event query for exports with retention awareness.
 */
export const buildExportQuery = (input: {
  company: Company;
  workspace?: Workspace | null;
  filters?: {
    from?: Date;
    to?: Date;
    action?: string;
    category?: string;
  };
}): Prisma.AuditEventWhereInput => {
  const retention = getRetentionWindowStart({
    company: input.company,
    workspace: input.workspace ? { retentionDays: input.workspace.retentionDays } : null,
  });

  const createdAtFilter: Prisma.DateTimeFilter = {
    gte: input.filters?.from
      ? new Date(Math.max(input.filters.from.getTime(), retention.start.getTime()))
      : retention.start,
  };

  if (input.filters?.to) {
    createdAtFilter.lte = input.filters.to;
  }

  const where: Prisma.AuditEventWhereInput = {
    companyId: input.company.id,
    createdAt: createdAtFilter,
    archived: false, // Only export non-archived events
    ...(input.workspace ? { workspaceId: input.workspace.id } : {}),
    ...(input.filters?.action ? { action: { equals: input.filters.action } } : {}),
    ...(input.filters?.category ? { category: { equals: input.filters.category } } : {}),
  };

  return where;
};

/**
 * Streams events for export with pagination.
 */
export async function* streamEventsForExport(input: {
  where: Prisma.AuditEventWhereInput;
  limit: number;
  batchSize?: number;
}): AsyncGenerator<Array<Prisma.AuditEventGetPayload<{}>>, void, unknown> {
  const batchSize = input.batchSize ?? 1000;
  let offset = 0;
  let totalFetched = 0;

  while (totalFetched < input.limit) {
    const batch = await prisma.auditEvent.findMany({
      where: input.where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: Math.min(batchSize, input.limit - totalFetched),
    });

    if (batch.length === 0) {
      break;
    }

    yield batch;
    totalFetched += batch.length;
    offset += batch.length;

    if (batch.length < batchSize) {
      break;
    }
  }
}

