"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exportRoutes;
const events_1 = require("../../schemas/events");
const helpers_1 = require("../../metering/helpers");
const increment_1 = require("../../metering/company/increment");
const increment_2 = require("../../metering/workspace/increment");
const client_1 = require("../../generated/prisma/client");
const MAX_EXPORT_EVENTS = 10000;
async function exportRoutes(fastify) {
    fastify.get('/v1/events/export', {
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const api = request.auth;
        if (!api)
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        const prisma = fastify.prisma;
        const parsed = events_1.EventExportSchema.safeParse(request.query);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error);
        }
        const q = parsed.data;
        const companyId = api.companyId;
        const workspaceId = api.scope === 'WORKSPACE'
            ? api.workspaceId
            : q.workspaceId ?? null;
        if (api.scope === 'COMPANY' && !workspaceId) {
            return reply.status(400).send({
                error: 'MUST_SPECIFY_WORKSPACE_FOR_COMPANY_KEY'
            });
        }
        // Retention limits
        const limits = await (0, helpers_1.getCompanyLimits)(companyId);
        const retentionDays = limits.retentionDays ?? 0;
        const retentionCutoff = limits.unlimitedRetention
            ? null
            : new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        const where = { workspaceId };
        if (retentionCutoff) {
            where.timestamp = { gte: retentionCutoff };
        }
        if (q.type)
            where.type = q.type;
        if (q.actorId)
            where.actorId = q.actorId;
        const events = await prisma.event.findMany({
            where,
            take: MAX_EXPORT_EVENTS,
            orderBy: { timestamp: 'asc' }
        });
        // Meter this export
        await (0, increment_1.incrementCompanyMeter)(companyId, client_1.MeterType.EXPORTS, 1);
        if (workspaceId) {
            await (0, increment_2.incrementWorkspaceMeter)(companyId, workspaceId, client_1.MeterType.EXPORTS, 1);
        }
        // Return in requested format
        switch (q.format) {
            case 'json':
                return reply.send({ data: events });
            case 'ndjson':
                reply.header('Content-Type', 'application/x-ndjson');
                return reply.send(events.map((e) => JSON.stringify(e)).join('\n'));
            case 'csv': {
                reply.header('Content-Type', 'text/csv');
                const header = Object.keys(events[0] || {}).join(',');
                const rows = events
                    .map((e) => Object.values(e)
                    .map((v) => JSON.stringify(v ?? ''))
                    .join(','))
                    .join('\n');
                return reply.send([header, rows].join('\n'));
            }
            default:
                return reply
                    .status(400)
                    .send({ error: 'UNSUPPORTED_FORMAT' });
        }
    });
}
