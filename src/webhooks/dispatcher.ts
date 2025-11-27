// src/webhooks/dispatcher.ts
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { signWebhook } from '../utils/webhook-signature';

const MAX_ATTEMPTS = 5;

export async function enqueueWebhookDelivery(companyId: string, event: any) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { webhookUrl: true, webhookSecret: true }
    });

    if (!company?.webhookUrl || !company.webhookSecret) return;

    await prisma.webhookDelivery.create({
        data: {
            companyId,
            eventId: event.id,
            url: company.webhookUrl,
            payload: event,
            status: 'PENDING'
        }
    });
}

export async function processWebhookDelivery(deliveryId: string) {
    const delivery = await prisma.webhookDelivery.findUnique({
        where: { id: deliveryId }
    });

    if (!delivery) return;

    const company = await prisma.company.findUnique({
        where: { id: delivery.companyId },
        select: { webhookSecret: true }
    });

    if (!company?.webhookSecret) return;

    const payload = delivery.payload as any;

    try {
        const signature = signWebhook(company.webhookSecret, payload);

        await axios.post(delivery.url, payload, {
            timeout: 5000,
            headers: {
                'x-hyrelog-signature': signature
            }
        });

        await prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
                status: 'SUCCESS',
                attempts: { increment: 1 },
                lastError: null
            }
        });
    } catch (err: any) {
        const attempts = delivery.attempts + 1;

        const nextRetry =
            attempts >= MAX_ATTEMPTS
                ? null
                : new Date(Date.now() + attempts * attempts * 1000); // exponential backoff

        await prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
                status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'RETRY',
                attempts,
                lastError: err?.message ?? 'Unknown error',
                nextAttemptAt: nextRetry
            }
        });
    }
}
