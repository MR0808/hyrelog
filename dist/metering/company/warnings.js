"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyWarnings = getCompanyWarnings;
// src/metering/company/warnings.ts
const prisma_1 = require("../../lib/prisma");
/**
 * Compute company-level EVENTS warnings
 * Uses BillingMeterCompany + company.eventsPerMonth
 */
async function getCompanyWarnings(companyId) {
    const company = await prisma_1.prisma.company.findUnique({
        where: { id: companyId }
    });
    if (!company)
        return null;
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const meter = await prisma_1.prisma.billingMeterCompany.findFirst({
        where: {
            companyId,
            meterType: 'EVENTS',
            periodStart
        }
    });
    // No meter yet = 0 usage
    const used = meter?.currentValue ?? 0;
    const cap = company.eventsPerMonth;
    // Hard limit
    const hardLimitReached = used >= cap;
    // Soft warning via company config OR softThreshold in the meter
    let softWarning = false;
    const percentThreshold = company.eventsWarningPercent;
    const absoluteThreshold = company.eventsWarningAbsolute;
    if (absoluteThreshold !== null && absoluteThreshold !== undefined) {
        if (used >= absoluteThreshold)
            softWarning = true;
    }
    if (percentThreshold !== null && percentThreshold !== undefined) {
        if (used >= (cap * percentThreshold) / 100)
            softWarning = true;
    }
    // Meter-level soft threshold (preferred)
    if (meter?.softThreshold && used >= meter.softThreshold) {
        softWarning = true;
    }
    return {
        events: {
            used,
            softWarning,
            hardLimitReached
        }
    };
}
