import { prisma } from "@/lib/prisma";
import { BillingCycle, BillingMeterType } from "@prisma/client";
/**
 * Closes current billing period and creates new one.
 * Should be triggered monthly (via Stripe webhook) with daily fallback.
 */
export const runBillingRollover = async () => {
    const now = new Date();
    const companies = await prisma.company.findMany({
        include: {
            plans: {
                include: {
                    plan: true,
                },
            },
        },
    });
    for (const company of companies) {
        if (!company.plans) {
            continue;
        }
        const companyPlan = company.plans;
        const currentPeriodEnd = new Date(companyPlan.currentPeriodEnd);
        // Only rollover if period has ended
        if (currentPeriodEnd > now) {
            continue;
        }
        // Calculate new period dates
        const periodStart = new Date(companyPlan.currentPeriodEnd);
        const periodEnd = new Date(periodStart);
        if (companyPlan.billingCycle === BillingCycle.MONTHLY) {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }
        // Snapshot current usage stats
        const usageStats = await prisma.usageStats.findMany({
            where: {
                companyId: company.id,
                periodStart: companyPlan.currentPeriodStart,
                periodEnd: companyPlan.currentPeriodEnd,
            },
        });
        // Compute overages (events ingested beyond limit)
        const activeMeter = await prisma.billingMeter.findFirst({
            where: {
                companyId: company.id,
                meterType: BillingMeterType.EVENTS,
                periodStart: companyPlan.currentPeriodStart,
                periodEnd: companyPlan.currentPeriodEnd,
            },
        });
        const overages = activeMeter
            ? Math.max(0, activeMeter.currentValue - activeMeter.limit)
            : 0;
        // TODO: Send usage to Stripe
        // await sendUsageToStripe(company.id, {
        //   periodStart: companyPlan.currentPeriodStart,
        //   periodEnd: companyPlan.currentPeriodEnd,
        //   eventsIngested: activeMeter?.currentValue ?? 0,
        //   overages,
        // });
        // Update company plan period
        await prisma.companyPlan.update({
            where: { companyId: company.id },
            data: {
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
            },
        });
        // Create new billing meter
        await prisma.billingMeter.create({
            data: {
                companyId: company.id,
                meterType: BillingMeterType.EVENTS,
                periodStart,
                periodEnd,
                limit: companyPlan.plan.monthlyEventLimit,
                currentValue: 0,
            },
        });
        // Initialize usage stats for new period
        await prisma.usageStats.createMany({
            data: [
                {
                    companyId: company.id,
                    workspaceId: null,
                    periodStart,
                    periodEnd,
                },
                // Workspace-specific stats will be created on-demand
            ],
        });
    }
};
//# sourceMappingURL=billingRollover.js.map