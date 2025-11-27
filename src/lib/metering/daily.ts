// src/lib/metering/daily.ts
import { prisma } from '../../lib/prisma';
import { startOfDayUTC } from './helpers';

export async function recordDailyEvent(
    companyId: string,
    workspaceId: string | null
) {
    const date = startOfDayUTC();

    await prisma.usageStats.upsert({
        where: {
            companyId_workspaceId_date: {
                companyId,
                workspaceId,
                date
            }
        },
        update: {
            eventsIngested: { increment: 1 }
        },
        create: {
            companyId,
            workspaceId,
            date,
            eventsIngested: 1,
            eventsStored: 0,
            seats: 0,
            activeApiKeys: 0,
            exportsRun: 0
        }
    });
}

export async function recordDailyExport(
    companyId: string,
    workspaceId: string | null
) {
    const date = startOfDayUTC();

    await prisma.usageStats.upsert({
        where: {
            companyId_workspaceId_date: {
                companyId,
                workspaceId,
                date
            }
        },
        update: {
            exportsRun: { increment: 1 }
        },
        create: {
            companyId,
            workspaceId,
            date,
            eventsIngested: 0,
            eventsStored: 0,
            seats: 0,
            activeApiKeys: 0,
            exportsRun: 1
        }
    });
}
