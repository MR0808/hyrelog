import { prisma } from '../lib/prisma';

export async function incrementCompanyDailyUsage(
    companyId: string,
    type: 'eventsIngested' | 'eventsStored' | 'exportsRun'
) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageStatsCompany.upsert({
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
