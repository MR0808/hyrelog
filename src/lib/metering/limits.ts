// src/lib/metering/limits.ts
import { prisma } from '../../lib/prisma';
import { getCompanyLimits } from './helpers';
import { currentBillingWindow } from './helpers';

export async function getMonthlyUsage(companyId: string) {
    const { periodStart } = currentBillingWindow();

    const eventMeter = await prisma.billingMeter.findUnique({
        where: {
            companyId_workspaceId_meterType_periodStart: {
                companyId,
                workspaceId: null,
                meterType: 'EVENTS',
                periodStart
            }
        }
    });

    const exportMeter = await prisma.billingMeter.findUnique({
        where: {
            companyId_workspaceId_meterType_periodStart: {
                companyId,
                workspaceId: null,
                meterType: 'EXPORTS',
                periodStart
            }
        }
    });

    return {
        events: eventMeter?.currentValue ?? 0,
        exports: exportMeter?.currentValue ?? 0
    };
}

/**
 * Determines if company has exceeded plan limits.
 * Does NOT block ingestion (soft limit).
 */
export async function checkSoftLimit(companyId: string) {
    const limits = await getCompanyLimits(companyId);
    const usage = await getMonthlyUsage(companyId);

    const eventPct = (usage.events / limits.eventsPerMonth) * 100;

    const warnPct = limits.warnPct ?? 80; // default 80%
    const warnAbs = limits.warnAbs ?? null;

    const exceedPct = eventPct >= warnPct;
    const exceedAbs = warnAbs !== null && usage.events >= warnAbs;

    return {
        softExceeded: exceedPct || exceedAbs,
        usage,
        limits,
        eventPct
    };
}
