// src/metering/monthly-workspace.ts
import { PrismaClient, MeterType } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export async function incrementWorkspaceMonthlyMeter(
    companyId: string,
    workspaceId: string,
    meterType: MeterType
) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await prisma.billingMeterWorkspace.upsert({
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
