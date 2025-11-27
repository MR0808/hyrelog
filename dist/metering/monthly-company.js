"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementCompanyMonthlyMeter = incrementCompanyMonthlyMeter;
const prisma_1 = require("../lib/prisma");
async function incrementCompanyMonthlyMeter(companyId, meterType) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await prisma_1.prisma.billingMeterCompany.upsert({
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
