import { prisma } from "@/lib/prisma";
import { BillingMeterType } from "@prisma/client";
/**
 * Reconciles usage stats by recounting events.
 * Runs hourly or daily to correct drift.
 */
export const runUsageReconciliation = async () => {
    const now = new Date();
    // Find active billing meters
    const activeMeters = await prisma.billingMeter.findMany({
        where: {
            meterType: BillingMeterType.EVENTS,
            periodStart: {
                lte: now,
            },
            periodEnd: {
                gt: now,
            },
        },
        include: {
            company: true,
        },
    });
    for (const meter of activeMeters) {
        // Count actual events ingested in this period
        const actualCount = await prisma.auditEvent.count({
            where: {
                companyId: meter.companyId,
                createdAt: {
                    gte: meter.periodStart,
                    lt: meter.periodEnd,
                },
                archived: false,
            },
        });
        // Update meter if drift detected
        if (Math.abs(actualCount - meter.currentValue) > 10) {
            // Only correct if difference is significant (>10 events)
            await prisma.billingMeter.update({
                where: { id: meter.id },
                data: {
                    currentValue: actualCount,
                },
            });
        }
        // Reconcile workspace-level usage stats
        const workspaces = await prisma.workspace.findMany({
            where: {
                companyId: meter.companyId,
            },
        });
        for (const workspace of workspaces) {
            const workspaceEventCount = await prisma.auditEvent.count({
                where: {
                    companyId: meter.companyId,
                    workspaceId: workspace.id,
                    createdAt: {
                        gte: meter.periodStart,
                        lt: meter.periodEnd,
                    },
                    archived: false,
                },
            });
            await prisma.usageStats.upsert({
                where: {
                    companyId_workspaceId_periodStart_periodEnd: {
                        companyId: meter.companyId,
                        workspaceId: workspace.id,
                        periodStart: meter.periodStart,
                        periodEnd: meter.periodEnd,
                    },
                },
                create: {
                    companyId: meter.companyId,
                    workspaceId: workspace.id,
                    periodStart: meter.periodStart,
                    periodEnd: meter.periodEnd,
                    eventsIngested: workspaceEventCount,
                },
                update: {
                    eventsIngested: workspaceEventCount,
                },
            });
        }
    }
};
//# sourceMappingURL=usageReconciliation.js.map