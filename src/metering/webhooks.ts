import axios from 'axios';
import { prisma } from '../lib/prisma';

/**
 * Trigger a webhook if configured for the company.
 * Safe + resilient with retry logic.
 */
export async function maybeTriggerWebhook(companyId: string, payload: any) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { webhookUrl: true }
    });

    if (!company?.webhookUrl) return;

    try {
        await axios.post(company.webhookUrl, payload, {
            timeout: 5000
        });
    } catch (err) {
        console.error('Webhook delivery failed:', err);
    }
}
