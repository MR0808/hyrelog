"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueWebhookDelivery = enqueueWebhookDelivery;
exports.processWebhookDelivery = processWebhookDelivery;
// src/webhooks/dispatcher.ts
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../lib/prisma");
const webhook_signature_1 = require("../utils/webhook-signature");
const MAX_ATTEMPTS = 5;
async function enqueueWebhookDelivery(companyId, event) {
    const company = await prisma_1.prisma.company.findUnique({
        where: { id: companyId },
        select: { webhookUrl: true, webhookSecret: true }
    });
    if (!company?.webhookUrl || !company.webhookSecret)
        return;
    await prisma_1.prisma.webhookDelivery.create({
        data: {
            companyId,
            eventId: event.id,
            url: company.webhookUrl,
            payload: event,
            status: 'PENDING'
        }
    });
}
async function processWebhookDelivery(deliveryId) {
    const delivery = await prisma_1.prisma.webhookDelivery.findUnique({
        where: { id: deliveryId }
    });
    if (!delivery)
        return;
    const company = await prisma_1.prisma.company.findUnique({
        where: { id: delivery.companyId },
        select: { webhookSecret: true }
    });
    if (!company?.webhookSecret)
        return;
    const payload = delivery.payload;
    try {
        const signature = (0, webhook_signature_1.signWebhook)(company.webhookSecret, payload);
        await axios_1.default.post(delivery.url, payload, {
            timeout: 5000,
            headers: {
                'x-hyrelog-signature': signature
            }
        });
        await prisma_1.prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
                status: 'SUCCESS',
                attempts: { increment: 1 },
                lastError: null
            }
        });
    }
    catch (err) {
        const attempts = delivery.attempts + 1;
        const nextRetry = attempts >= MAX_ATTEMPTS
            ? null
            : new Date(Date.now() + attempts * attempts * 1000); // exponential backoff
        await prisma_1.prisma.webhookDelivery.update({
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
