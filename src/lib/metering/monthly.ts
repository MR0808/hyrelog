// src/lib/metering/monthly.ts
import { prisma } from '../../lib/prisma';
import { currentBillingWindow } from './helpers';
import { MeterType } from '../../generated/prisma/client';

export async function incrementMonthlyMeter(
    companyId: string,
    workspaceId: string | null,
    meterType: MeterType,
    amount: number = 1
) {
    const { periodStart, periodEnd } = currentBillingWindow();

    await prisma.billingMeter.upsert({
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
            lastIncrementAt: new Date()
        },
        create: {
            companyId,
            workspaceId,
            meterType,
            periodStart,
            periodEnd,
            currentValue: amount,
            unitSize: 100000,
            unitPrice: 0,
            hardCap: true
        }
    });
}
