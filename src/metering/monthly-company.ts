import { MeterType } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export async function incrementCompanyMonthlyMeter(
    companyId: string,
    meterType: MeterType
) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await prisma.billingMeterCompany.upsert({
        where: {
            companyId_meterType_periodStart: {
                companyId,
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
            meterType,
            periodStart,
            periodEnd,
            currentValue: 1
        }
    });
}
