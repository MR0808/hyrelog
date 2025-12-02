import { prisma } from "@/lib/prisma";

import { getRetentionWindowStart } from "@/lib/retention";

/**
 * Marks events outside retention window for archival.
 * Runs daily.
 */
export const runRetentionMarking = async (): Promise<void> => {
  const companies = await prisma.company.findMany({
    include: {
      workspaces: true,
    },
  });

  for (const company of companies) {
    const retention = getRetentionWindowStart({ company });

    // Mark company-level events
    await prisma.auditEvent.updateMany({
      where: {
        companyId: company.id,
        createdAt: {
          lt: retention.start,
        },
        archived: false,
        archivalCandidate: false,
      },
      data: {
        archivalCandidate: true,
      },
    });

    // Mark workspace-level events (respecting workspace retention overrides)
    for (const workspace of company.workspaces) {
      const workspaceRetention = getRetentionWindowStart({
        company,
        workspace: { retentionDays: workspace.retentionDays },
      });

      await prisma.auditEvent.updateMany({
        where: {
          companyId: company.id,
          workspaceId: workspace.id,
          createdAt: {
            lt: workspaceRetention.start,
          },
          archived: false,
          archivalCandidate: false,
        },
        data: {
          archivalCandidate: true,
        },
      });
    }
  }
};

