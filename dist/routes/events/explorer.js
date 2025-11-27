"use strict";
// src/routes/events/explorer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventExplorerRoutes = eventExplorerRoutes;
const prisma_1 = require("../../lib/prisma");
const events_1 = require("../../schemas/events");
const pagination_1 = require("../../utils/pagination");
const WORKSPACE_DEFAULT_LIMIT = 200;
const WORKSPACE_MAX_LIMIT = 500;
const COMPANY_DEFAULT_LIMIT = 100;
const COMPANY_MAX_LIMIT = 250;
function applyRetention(company, from) {
    if (company.unlimitedRetention)
        return from;
    const now = new Date();
    const cutoff = new Date(now.getTime() - company.retentionDays * 86400000);
    return from && from > cutoff ? from : cutoff;
}
async function eventExplorerRoutes(fastify) {
    fastify.get('/v1/events', {
        preHandler: fastify.authenticate,
        config: {
            rateLimit: {
                max: 60,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const parsed = events_1.EventQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return reply.code(400).send({ error: parsed.error.flatten() });
        }
        const { scope, companyId, workspaceId: apiWorkspaceId } = request.auth;
        const { workspaceId, type, actorId, from, to, q, cursor, limit } = parsed.data;
        // patched: safe rateLimit access
        const cfg = request.routeOptions.config;
        if (cfg.rateLimit) {
            cfg.rateLimit.max = scope === 'WORKSPACE' ? 120 : 60;
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
        const rawLimit = limit ??
            (scope === 'WORKSPACE'
                ? WORKSPACE_DEFAULT_LIMIT
                : COMPANY_DEFAULT_LIMIT);
        const maxLimit = scope === 'WORKSPACE' ? WORKSPACE_MAX_LIMIT : COMPANY_MAX_LIMIT;
        const take = Math.min(Math.max(rawLimit, 1), maxLimit);
        const page = await (0, pagination_1.paginate)({
            model: prisma_1.prisma.event,
            where,
            orderBy: { timestamp: 'desc' },
            cursor: cursor ?? null,
            limit: take
        });
        return reply.send({
            data: page.data,
            nextCursor: page.nextCursor,
            pagination: {
                limit: take,
                nextCursor: page.nextCursor
            }
        });
    });
}
