"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = explorerRoutes;
const events_1 = require("../../schemas/events");
const helpers_1 = require("../../metering/helpers");
const WORKSPACE_DEFAULT_LIMIT = 200;
const WORKSPACE_MAX_LIMIT = 500;
const COMPANY_DEFAULT_LIMIT = 100;
const COMPANY_MAX_LIMIT = 250;
async function explorerRoutes(fastify) {
    fastify.get('/v1/events', {
        config: {
            rateLimit: {
                max: 60,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth) {
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        }
        const prisma = fastify.prisma;
        const parsed = events_1.EventQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            return reply.status(400).send(parsed.error);
        }
        const q = parsed.data;
        const companyId = auth.companyId;
        // Scope workspaceId based on key type
        const workspaceId = auth.scope === 'WORKSPACE'
            ? auth.workspaceId
            : q.workspaceId ?? undefined;
        // -------------------------------------------------
        // Retention limits (company-level)
        // -------------------------------------------------
        const limits = await (0, helpers_1.getCompanyLimits)(companyId);
        const retentionDays = limits.retentionDays ?? 0;
        const retentionCutoff = limits.unlimitedRetention
            ? null
            : new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        // -------------------------------------------------
        // Pagination limits
        // -------------------------------------------------
        let limit = typeof q.limit === 'number'
            ? q.limit
            : auth.scope === 'COMPANY'
                ? COMPANY_DEFAULT_LIMIT
                : WORKSPACE_DEFAULT_LIMIT;
        if (!Number.isFinite(limit) || limit <= 0) {
            limit =
                auth.scope === 'COMPANY'
                    ? COMPANY_DEFAULT_LIMIT
                    : WORKSPACE_DEFAULT_LIMIT;
        }
        limit =
            auth.scope === 'COMPANY'
                ? Math.min(Math.max(limit, 1), COMPANY_MAX_LIMIT)
                : Math.min(Math.max(limit, 1), WORKSPACE_MAX_LIMIT);
        const cursor = q.cursor;
        // -------------------------------------------------
        // WHERE clause
        // -------------------------------------------------
        const where = {
            workspace: {
                companyId
            }
        };
        if (workspaceId) {
            where.workspaceId = workspaceId;
        }
        // Timestamp range (respect retention)
        if (retentionCutoff || q.from || q.to) {
            const ts = {};
            if (retentionCutoff) {
                ts.gte = retentionCutoff;
            }
            if (q.from) {
                const fromDate = new Date(q.from);
                ts.gte = ts.gte
                    ? new Date(Math.max(ts.gte.getTime(), fromDate.getTime()))
                    : fromDate;
            }
            if (q.to) {
                ts.lte = new Date(q.to);
            }
            where.timestamp = ts;
        }
        if (q.type) {
            where.type = q.type;
        }
        if (q.actorId) {
            where.actorId = q.actorId;
        }
        if (q.q) {
            const term = q.q;
            where.OR = [
                {
                    actorName: {
                        contains: term,
                        mode: 'insensitive'
                    }
                },
                {
                    actorEmail: {
                        contains: term,
                        mode: 'insensitive'
                    }
                },
                {
                    type: {
                        contains: term,
                        mode: 'insensitive'
                    }
                }
            ];
        }
        // -------------------------------------------------
        // Fetch page of events
        // -------------------------------------------------
        const events = await prisma.event.findMany({
            where,
            take: limit,
            skip: cursor ? 1 : 0,
            ...(cursor ? { cursor: { id: cursor } } : {}),
            orderBy: { timestamp: 'desc' }
        });
        const nextCursor = events.length === limit ? events[events.length - 1].id : null;
        return reply.send({
            data: events,
            nextCursor
        });
    });
}
