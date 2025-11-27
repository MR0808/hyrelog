"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementWorkspaceMonthlyMeter = incrementWorkspaceMonthlyMeter;
const prisma_1 = require("../lib/prisma");
async function incrementWorkspaceMonthlyMeter(companyId, workspaceId, meterType) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await prisma_1.prisma.billingMeterWorkspace.upsert({
        where: {
            companyId_workspaceId_meterType_periodStart: {
                companyId,
                workspaceId,
                meterType,
                periodStart
            }
        },
        update: {
            currentValue: { increment: 1 },
            lastIncrementAt: new Date()
        },
        create: {
            companyId,
            workspaceId,
            meterType,
            periodStart,
            periodEnd,
            currentValue: 1
        }
    });
}
