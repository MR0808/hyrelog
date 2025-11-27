// src/metering/company/increment.ts
import { MeterType, BillingMeterCompany } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { getCompanyWarnings } from './warnings';
import { maybeTriggerWebhook } from '../webhooks';

/**
 * Increment company-level monthly meter (EVENTS, EXPORTS, WORKSPACES, USERS)
 */
export async function incrementCompanyMeter(
    companyId: string,
    meterType: MeterType,
    amount: number
) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const meter = await prisma.billingMeterCompany.upsert({
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
    const warnings = await getCompanyWarnings(companyId);

    // If this meter is EVENTS, warnings.events applies
    if (meterType === MeterType.EVENTS && warnings) {
        const ev = warnings.events;

        if (ev.softWarning) {
            await maybeTriggerWebhook(companyId, {
                type: 'COMPANY_EVENTS_SOFT_WARNING',
                meterType,
                used: ev.used,
                threshold: 'SOFT'
            });
        }

        if (ev.hardLimitReached) {
            await maybeTriggerWebhook(companyId, {
                type: 'COMPANY_EVENTS_HARD_LIMIT_REACHED',
                meterType,
                used: ev.used,
                threshold: 'HARD'
            });
        }
    }

    return meter;
}
