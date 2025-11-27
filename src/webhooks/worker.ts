// src/webhooks/worker.ts
import { prisma } from '../lib/prisma';
import { processWebhookDelivery } from './dispatcher';

export async function runWebhookWorker() {
    const jobs = await prisma.webhookDelivery.findMany({
        where: {
            OR: [
                { status: 'PENDING' },
                { status: 'RETRY', nextAttemptAt: { lte: new Date() } }
            ]
        },
        take: 20,
        orderBy: { createdAt: 'asc' }
    });

    for (const job of jobs) {
        await processWebhookDelivery(job.id);
    }
}
