"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementWorkspaceDailyUsage = incrementWorkspaceDailyUsage;
const prisma_1 = require("../lib/prisma");
async function incrementWorkspaceDailyUsage(companyId, workspaceId, type) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma_1.prisma.usageStatsWorkspace.upsert({
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
