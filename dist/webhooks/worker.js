"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWebhookWorker = runWebhookWorker;
// src/webhooks/worker.ts
const prisma_1 = require("../lib/prisma");
const dispatcher_1 = require("./dispatcher");
async function runWebhookWorker() {
    const jobs = await prisma_1.prisma.webhookDelivery.findMany({
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
        await (0, dispatcher_1.processWebhookDelivery)(job.id);
    }
}
