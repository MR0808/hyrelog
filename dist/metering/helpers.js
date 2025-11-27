"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOfDayUTC = startOfDayUTC;
exports.currentBillingWindow = currentBillingWindow;
exports.getCompanyLimits = getCompanyLimits;
// src/lib/metering/helpers.ts
const prisma_1 = require("../lib/prisma");
/**
 * Normalizes dates to midnight UTC for consistent daily tracking.
 */
function startOfDayUTC(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
/**
 * Returns the current billing month window.
 * Used for BillingMeter monthly metering.
 */
function currentBillingWindow() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return { periodStart: start, periodEnd: end };
}
/**
 * Fetches company effective limits (plan + add-ons).
 */
async function getCompanyLimits(companyId) {
    const company = await prisma_1.prisma.company.findUnique({
        where: { id: companyId },
        include: {
            companyAddOns: {
                include: { addOn: true }
            }
        }
    });
    if (!company)
        throw new Error('Company not found');
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
