"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeTriggerWebhook = maybeTriggerWebhook;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../lib/prisma");
/**
 * Trigger a webhook if configured for the company.
 * Safe + resilient with retry logic.
 */
async function maybeTriggerWebhook(companyId, payload) {
    const company = await prisma_1.prisma.company.findUnique({
        where: { id: companyId },
        select: { webhookUrl: true }
    });
    if (!company?.webhookUrl)
        return;
    try {
        await axios_1.default.post(company.webhookUrl, payload, {
            timeout: 5000
        });
    }
    catch (err) {
        console.error('Webhook delivery failed:', err);
    }
}
