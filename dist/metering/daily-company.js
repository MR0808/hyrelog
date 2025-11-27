"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementCompanyDailyUsage = incrementCompanyDailyUsage;
const prisma_1 = require("../lib/prisma");
async function incrementCompanyDailyUsage(companyId, type) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma_1.prisma.usageStatsCompany.upsert({
        where: {
            companyId_date: {
                companyId,
                date: today
            }
        },
        update: {
            [type]: { increment: 1 }
        },
        create: {
            companyId,
            date: today,
            [type]: 1
        }
    });
}
