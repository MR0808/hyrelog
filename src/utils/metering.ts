// // src/lib/metering.ts
// import { prisma } from '../lib/prisma';

// export async function recordEventIngest(
//     companyId: string,
//     workspaceId: string | null
// ) {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     await prisma.usageStats.upsert({
//         where: {
//             companyId_workspaceId_date: {
//                 companyId,
//                 workspaceId,
//                 date: today
//             }
//         },
//         update: {
//             eventsIngested: { increment: 1 }
//         },
//         create: {
//             companyId,
//             workspaceId,
//             date: today,
//             eventsIngested: 1,
//             eventsStored: 0,
//             seats: 0,
//             activeApiKeys: 0,
//             exportsRun: 0
//         }
//     });
// }
