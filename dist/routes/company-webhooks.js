"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = companyWebhookRoutes;
const webhooks_1 = require("../schemas/webhooks");
const webhook_signature_1 = require("../utils/webhook-signature");
async function companyWebhookRoutes(fastify) {
    /**
     * ---------------------------------------------------------------------
     * PUT /v1/company/webhook
     * Configure webhook URL + secret
     * ---------------------------------------------------------------------
     */
    fastify.put('/v1/company/webhook', {
        config: {
            rateLimit: { max: 10, timeWindow: '1 minute' }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth)
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        if (auth.scope !== 'COMPANY')
            return reply.status(403).send({ error: 'FORBIDDEN' });
        const parsed = webhooks_1.UpdateWebhookSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error);
        }
        const { url, secret } = parsed.data;
        const company = await fastify.prisma.company.update({
            where: { id: auth.companyId },
            data: {
                webhookUrl: url,
                webhookSecret: secret
            }
        });
        return reply.send({ data: company });
    });
    /**
     * ---------------------------------------------------------------------
     * DELETE /v1/company/webhook
     * Disable webhooks
     * ---------------------------------------------------------------------
     */
    fastify.delete('/v1/company/webhook', {
        config: {
            rateLimit: { max: 10, timeWindow: '1 minute' }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth)
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        if (auth.scope !== 'COMPANY')
            return reply.status(403).send({ error: 'FORBIDDEN' });
        await fastify.prisma.company.update({
            where: { id: auth.companyId },
            data: {
                webhookUrl: null,
                webhookSecret: null
            }
        });
        return reply.send({ success: true });
    });
    /**
     * ---------------------------------------------------------------------
     * POST /v1/company/webhook/test
     * Sends a test webhook with HMAC signature
     * ---------------------------------------------------------------------
     */
    fastify.post('/v1/company/webhook/test', {
        config: {
            rateLimit: { max: 5, timeWindow: '1 minute' }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth)
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        if (auth.scope !== 'COMPANY')
            return reply.status(403).send({ error: 'FORBIDDEN' });
        const prisma = fastify.prisma;
        const company = await prisma.company.findUnique({
            where: { id: auth.companyId },
            select: { webhookUrl: true, webhookSecret: true }
        });
        if (!company?.webhookUrl || !company.webhookSecret) {
            return reply
                .status(400)
                .send({ error: 'WEBHOOK_NOT_CONFIGURED' });
        }
        const payload = {
            test: true,
            timestamp: new Date().toISOString(),
            message: 'HyreLog webhook test successful.'
        };
        const signature = (0, webhook_signature_1.signWebhook)(company.webhookSecret, payload);
        try {
            const res = await fetch(company.webhookUrl, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-hyrelog-signature': signature
                },
                body: JSON.stringify(payload)
            });
            const status = res.status;
            return reply.send({
                success: status >= 200 && status < 300,
                status
            });
        }
        catch (err) {
            return reply.status(500).send({
                error: 'FAILED_TO_SEND',
                detail: err.message
            });
        }
    });
}
