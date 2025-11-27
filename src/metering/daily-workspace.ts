import { prisma } from '../lib/prisma';

export async function incrementWorkspaceDailyUsage(
    companyId: string,
    workspaceId: string,
    type: 'eventsIngested' | 'eventsStored' | 'exportsRun'
) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageStatsWorkspace.upsert({
        where: {
            companyId_workspaceId_date: {
                companyId,
                workspaceId,
                date: today
            }
        },
        update: {
            [type]: { increment: 1 }
        },
        create: {
            companyId,
            workspaceId,
            date: today,
            [type]: 1
        }
    });
}
