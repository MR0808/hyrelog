// src/lib/metering/helpers.ts
import { prisma } from '../lib/prisma';

/**
 * Normalizes dates to midnight UTC for consistent daily tracking.
 */
export function startOfDayUTC(date = new Date()): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/**
 * Returns the current billing month window.
 * Used for BillingMeter monthly metering.
 */
export function currentBillingWindow(): {
    periodStart: Date;
    periodEnd: Date;
} {
    const now = new Date();
    const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );
    return { periodStart: start, periodEnd: end };
}

/**
 * Fetches company effective limits (plan + add-ons).
 */
export async function getCompanyLimits(companyId: string) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
            companyAddOns: {
                include: { addOn: true }
            }
        }
    });

    if (!company) throw new Error('Company not found');

    const addOnExtraEvents = company.companyAddOns
        .filter((a) => a.active)
        .reduce((sum, item) => sum + (item.addOn.extraEventsPerMonth || 0), 0);

    const addOnExtraExports = company.companyAddOns
        .filter((a) => a.active)
        .reduce((sum, item) => sum + (item.addOn.extraExportsPerMonth || 0), 0);

    return {
        eventsPerMonth: company.eventsPerMonth + addOnExtraEvents,
        exportsPerMonth: company.exportsPerMonth + addOnExtraExports,
        retentionDays: company.unlimitedRetention
            ? null
            : company.retentionDays,
        unlimitedRetention: company.unlimitedRetention,
        warnPct: company.eventsWarningPercent || null,
        warnAbs: company.eventsWarningAbsolute || null,
        exportWarnPct: company.exportsWarningPercent || null,
        exportWarnAbs: company.exportsWarningAbsolute || null
    };
}
