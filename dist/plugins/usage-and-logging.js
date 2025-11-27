"use strict";
// src/plugins/usage-and-logging.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const prisma_1 = require("../lib/prisma");
const client_1 = require("../generated/prisma/client");
function meterTypeFromString(meter) {
    return meter === 'EVENTS' ? client_1.MeterType.EVENTS : client_1.MeterType.EXPORTS;
}
/**
 * Usage + logging plugin:
 * - Logs every API-key request to ApiKeyLog
 * - Enforces company-level meters (EVENTS, EXPORTS)
 * - Increments meters
 */
const usagePlugin = async (fastify) => {
    // Log every API-key request
    fastify.decorate('logApiKeyRequest', async (request, reply, durationMs) => {
        if (!request.auth)
            return;
        const { apiKeyId, companyId, workspaceId } = request.auth;
        const ip = request.ip;
        const ua = request.headers['user-agent'];
        try {
            await prisma_1.prisma.apiKeyLog.create({
                data: {
                    apiKeyId,
                    companyId,
                    workspaceId: workspaceId ?? null,
                    method: request.method,
                    path: request.url,
                    statusCode: reply.statusCode,
                    durationMs,
                    ip,
                    userAgent: ua
                }
            });
        }
        catch (err) {
            request.log.error({ err }, 'Failed to log API key request');
        }
    });
    /**
     * Enforce company-level usage meter (EVENTS or EXPORTS) before a heavy operation.
     * If:
     * - no BillingMeter row exists → allow (you can treat as misconfig/log)
     * - company's allowed == 0 → treat as unlimited
     * - currentValue >= allowed → 429
     */
    fastify.decorate('enforceCompanyMeter', (meter) => async (request, reply) => {
        if (!request.auth) {
            reply.code(401).send({ error: 'Unauthenticated' });
            return;
        }
        const { companyId } = request.auth;
        const now = new Date();
        const meterType = meterTypeFromString(meter);
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId },
            include: {
                companyAddOns: {
                    where: { active: true },
                    include: { addOn: true }
                }
            }
        });
        if (!company) {
            reply.code(404).send({ error: 'Company not found' });
            return;
        }
        const meterRow = await prisma_1.prisma.billingMeter.findFirst({
            where: {
                companyId,
                meterType,
                periodStart: { lte: now },
                periodEnd: { gte: now }
            }
        });
        // If there is no meter row, we let it pass (but you could log this as a config issue)
        if (!meterRow)
            return;
        const extraEvents = company.companyAddOns.reduce((sum, ca) => sum + ca.addOn.extraEventsPerMonth, 0);
        const extraExports = company.companyAddOns.reduce((sum, ca) => sum + ca.addOn.extraExportsPerMonth, 0);
        let allowed = 0;
        if (meter === 'EVENTS') {
            allowed = company.eventsPerMonth + extraEvents;
        }
        else {
            allowed = company.exportsPerMonth + extraExports;
        }
        // Interpret allowed <= 0 as "unlimited"
        if (allowed <= 0)
            return;
        if (meterRow.currentValue >= allowed) {
            reply.code(429).send({ error: `${meter} usage limit reached` });
            return;
        }
    });
    /**
     * Increment company meter after a successful operation.
     */
    fastify.decorate('incrementCompanyMeter', async (meter, companyId, workspaceId, amount = 1) => {
        const now = new Date();
        const meterType = meterTypeFromString(meter);
        await prisma_1.prisma.billingMeter.updateMany({
            where: {
                companyId,
                workspaceId: workspaceId ?? undefined,
                meterType,
                periodStart: { lte: now },
                periodEnd: { gte: now }
            },
            data: {
                currentValue: { increment: amount },
                lastIncrementAt: now
            }
        });
    });
};
exports.default = (0, fastify_plugin_1.default)(usagePlugin, { name: 'usage-plugin' });
