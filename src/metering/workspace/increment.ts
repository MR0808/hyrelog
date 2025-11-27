// src/metering/workspace/increment.ts
import { MeterType } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { getWorkspaceWarnings } from './warnings';
import { maybeTriggerWebhook } from '../webhooks';

/**
 * Increment monthly workspace meter (EVENTS, EXPORTS, WORKSPACES, USERS)
 */
export async function incrementWorkspaceMeter(
    companyId: string,
    workspaceId: string,
    meterType: MeterType,
    amount: number
) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const meter = await prisma.billingMeterWorkspace.upsert({
        where: {
            companyId_workspaceId_meterType_periodStart: {
                companyId,
                workspaceId,
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
            workspaceId,
            meterType,
            periodStart,
            periodEnd,
            currentValue: amount
        }
    });

    //
    // ----------------------------------------------------
    // Compute warnings
    // ----------------------------------------------------
    //
    const warnings = await getWorkspaceWarnings(companyId, workspaceId);

    if (meterType === MeterType.EVENTS && warnings) {
        const ev = warnings.events;

        if (ev.softWarning) {
            await maybeTriggerWebhook(companyId, {
                type: 'WORKSPACE_EVENTS_SOFT_WARNING',
                workspaceId,
                meterType,
                used: ev.used,
                threshold: 'SOFT'
            });
        }

        if (ev.hardLimitReached) {
            await maybeTriggerWebhook(companyId, {
                type: 'WORKSPACE_EVENTS_HARD_LIMIT_REACHED',
                workspaceId,
                meterType,
                used: ev.used,
                threshold: 'HARD'
            });
        }
    }

    return meter;
}
