"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementCompanyMeter = incrementCompanyMeter;
// src/metering/company/increment.ts
const client_1 = require("../../generated/prisma/client");
const prisma_1 = require("../../lib/prisma");
const warnings_1 = require("./warnings");
const webhooks_1 = require("../webhooks");
/**
 * Increment company-level monthly meter (EVENTS, EXPORTS, WORKSPACES, USERS)
 */
async function incrementCompanyMeter(companyId, meterType, amount) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const meter = await prisma_1.prisma.billingMeterCompany.upsert({
        where: {
            companyId_meterType_periodStart: {
                companyId,
                meterType,
                periodStart
            }
        },
        update: {
            currentValue: { increment: amount },
            lastIncrementAt: now
        },
        create: {
            companyId,
            meterType,
            periodStart,
            periodEnd,
            currentValue: amount
        }
    });
    //
    // -------------------------------------------------------------------
    // Compute warnings AFTER increment
    // -------------------------------------------------------------------
    //
    const warnings = await (0, warnings_1.getCompanyWarnings)(companyId);
    // If this meter is EVENTS, warnings.events applies
    if (meterType === client_1.MeterType.EVENTS && warnings) {
        const ev = warnings.events;
        if (ev.softWarning) {
            await (0, webhooks_1.maybeTriggerWebhook)(companyId, {
                type: 'COMPANY_EVENTS_SOFT_WARNING',
                meterType,
                used: ev.used,
                threshold: 'SOFT'
            });
        }
        if (ev.hardLimitReached) {
            await (0, webhooks_1.maybeTriggerWebhook)(companyId, {
                type: 'COMPANY_EVENTS_HARD_LIMIT_REACHED',
                meterType,
                used: ev.used,
                threshold: 'HARD'
            });
        }
    }
    return meter;
}
