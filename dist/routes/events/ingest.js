"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ingestRoutes;
const crypto_1 = __importDefault(require("crypto"));
const events_1 = require("../../schemas/events");
const toJson_1 = require("../../utils/toJson");
const hashchain_1 = require("../../utils/hashchain");
const daily_company_1 = require("../../metering/daily-company");
const daily_workspace_1 = require("../../metering/daily-workspace");
const increment_1 = require("../../metering/company/increment");
const increment_2 = require("../../metering/workspace/increment");
const client_1 = require("../../generated/prisma/client");
const dispatcher_1 = require("../../webhooks/dispatcher");
async function ingestRoutes(fastify) {
    fastify.post('/v1/events', {
        config: {
            rateLimit: {
                max: 60,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth || auth.scope !== 'WORKSPACE') {
            return reply
                .status(403)
                .send({ error: 'WORKSPACE_API_KEY_REQUIRED' });
        }
        const companyId = auth.companyId;
        const workspaceId = auth.workspaceId;
        // -------------------------------------------------
        // 1. Enforce company-wide EVENTS hard cap
        // -------------------------------------------------
        const company = await fastify.prisma.company.findUnique({
            where: { id: companyId }
        });
        if (!company) {
            return reply.status(404).send({ error: 'COMPANY_NOT_FOUND' });
        }
        if (!company.unlimitedRetention && company.eventsPerMonth > 0) {
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const meter = await fastify.prisma.billingMeterCompany.findFirst({
                where: {
                    companyId,
                    meterType: 'EVENTS',
                    periodStart
                }
            });
            const used = meter?.currentValue ?? 0;
            const cap = company.eventsPerMonth;
            if (used >= cap) {
                return reply.status(429).send({
                    error: 'EVENT_LIMIT_REACHED',
                    used,
                    cap
                });
            }
        }
        // -------------------------------------------------
        // 2. Validate payload
        // -------------------------------------------------
        const parsed = events_1.EventIngestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error);
        }
        const data = parsed.data;
        // -------------------------------------------------
        // 3. Get previous event hash for this workspace
        // -------------------------------------------------
        const prevEvent = await fastify.prisma.event.findFirst({
            where: { workspaceId },
            orderBy: { timestamp: 'desc' }
        });
        const prevHash = prevEvent?.hash ?? null;
        const chainId = prevEvent?.chainId ?? crypto_1.default.randomUUID();
        // -------------------------------------------------
        // 4. Build hash-chain value
        // -------------------------------------------------
        const hash = (0, hashchain_1.buildEventHash)({
            type: data.type,
            actorId: data.actorId,
            actorType: data.actorType,
            actorName: data.actorName,
            actorEmail: data.actorEmail,
            metadata: data.metadata,
            before: data.before,
            after: data.after,
            prevHash
        });
        // -------------------------------------------------
        // 5. Persist event
        // -------------------------------------------------
        const event = await fastify.prisma.event.create({
            data: {
                workspaceId,
                type: data.type,
                actorId: data.actorId ?? null,
                actorType: data.actorType ?? null,
                actorName: data.actorName ?? null,
                actorEmail: data.actorEmail ?? null,
                metadata: (0, toJson_1.toJson)(data.metadata),
                before: (0, toJson_1.toJson)(data.before),
                after: (0, toJson_1.toJson)(data.after),
                chainId,
                prevHash,
                hash
            }
        });
        // -------------------------------------------------
        // 6. Webhook: EVENT_INGESTED (queued)
        // -------------------------------------------------
        (0, dispatcher_1.enqueueWebhookDelivery)(companyId, event).catch(() => {
            // swallow errors; ingestion should not fail due to webhook
        });
        // -------------------------------------------------
        // 7. Metering increments
        // -------------------------------------------------
        await (0, daily_company_1.incrementCompanyDailyUsage)(companyId, 'eventsIngested');
        await (0, daily_workspace_1.incrementWorkspaceDailyUsage)(companyId, workspaceId, 'eventsIngested');
        await (0, increment_1.incrementCompanyMeter)(companyId, client_1.MeterType.EVENTS, 1);
        await (0, increment_2.incrementWorkspaceMeter)(companyId, workspaceId, client_1.MeterType.EVENTS, 1);
        return reply.status(201).send({ data: event });
    });
}
