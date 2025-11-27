"use strict";
// src/routes/events/export.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventExportRoutes = eventExportRoutes;
const prisma_1 = require("../../lib/prisma");
const events_1 = require("../../schemas/events");
const MAX_EXPORT_EVENTS = 10000;
function applyRetention(company, from) {
    if (company.unlimitedRetention)
        return from;
    const now = new Date();
    const cutoff = new Date(now.getTime() - company.retentionDays * 86400000);
    return from && from > cutoff ? from : cutoff;
}
async function eventExportRoutes(fastify) {
    fastify.get('/v1/events/export', {
        preHandler: [
            fastify.authenticate,
            fastify.enforceCompanyMeter('EXPORTS')
        ],
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const parsed = events_1.EventExportSchema.safeParse(request.query);
        if (!parsed.success) {
            return reply.code(400).send({ error: parsed.error.flatten() });
        }
        const { scope, companyId, workspaceId: apiWorkspaceId } = request.auth;
        const { workspaceId, format, type, actorId, from, to, q } = parsed.data;
        const cfg = request.routeOptions.config;
        if (cfg.rateLimit) {
            cfg.rateLimit.max = scope === 'WORKSPACE' ? 20 : 10;
        }
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId }
        });
        if (!company)
            return reply.code(404).send({ error: 'Company not found' });
        const requestedFrom = from ? new Date(from) : undefined;
        const requestedTo = to ? new Date(to) : undefined;
        const effectiveFrom = applyRetention(company, requestedFrom);
        const where = { workspace: { companyId } };
        if (scope === 'WORKSPACE') {
            if (!apiWorkspaceId) {
                return reply
                    .code(403)
                    .send({ error: 'Invalid workspace API key' });
            }
            where.workspaceId = apiWorkspaceId;
        }
        else if (workspaceId) {
            where.workspaceId = workspaceId;
        }
        if (type)
            where.type = type;
        if (actorId)
            where.actorId = actorId;
        if (effectiveFrom || requestedTo) {
            where.timestamp = {
                ...(effectiveFrom ? { gte: effectiveFrom } : {}),
                ...(requestedTo ? { lte: requestedTo } : {})
            };
        }
        if (q) {
            where.OR = [
                { type: { contains: q, mode: 'insensitive' } },
                { actorName: { contains: q, mode: 'insensitive' } },
                { actorEmail: { contains: q, mode: 'insensitive' } }
            ];
        }
        const events = await prisma_1.prisma.event.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: MAX_EXPORT_EVENTS + 1
        });
        const slice = events.slice(0, MAX_EXPORT_EVENTS);
        await fastify.incrementCompanyMeter('EXPORTS', companyId, null, slice.length);
        if (events.length > MAX_EXPORT_EVENTS) {
            reply.header('X-HyreLog-Truncated', 'true');
        }
        if (format === 'csv') {
            reply.header('Content-Type', 'text/csv');
            const header = 'id,timestamp,type,actorId,actorName,actorEmail\n';
            const csv = slice
                .map((e) => [
                e.id,
                e.timestamp.toISOString(),
                e.type,
                e.actorId ?? '',
                e.actorName ?? '',
                e.actorEmail ?? ''
            ].join(','))
                .join('\n');
            return reply.send(header + csv);
        }
        if (format === 'ndjson') {
            reply.header('Content-Type', 'application/x-ndjson');
            const nd = slice.map((e) => JSON.stringify(e)).join('\n');
            return reply.send(nd);
        }
        return reply.send({ data: slice });
    });
}
