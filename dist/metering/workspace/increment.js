"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementWorkspaceMeter = incrementWorkspaceMeter;
// src/metering/workspace/increment.ts
const client_1 = require("../../generated/prisma/client");
const prisma_1 = require("../../lib/prisma");
const warnings_1 = require("./warnings");
const webhooks_1 = require("../webhooks");
/**
 * Increment monthly workspace meter (EVENTS, EXPORTS, WORKSPACES, USERS)
 */
async function incrementWorkspaceMeter(companyId, workspaceId, meterType, amount) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const meter = await prisma_1.prisma.billingMeterWorkspace.upsert({
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
    const warnings = await (0, warnings_1.getWorkspaceWarnings)(companyId, workspaceId);
    if (meterType === client_1.MeterType.EVENTS && warnings) {
        const ev = warnings.events;
        if (ev.softWarning) {
            await (0, webhooks_1.maybeTriggerWebhook)(companyId, {
                type: 'WORKSPACE_EVENTS_SOFT_WARNING',
                workspaceId,
                meterType,
                used: ev.used,
                threshold: 'SOFT'
            });
        }
        if (ev.hardLimitReached) {
            await (0, webhooks_1.maybeTriggerWebhook)(companyId, {
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
