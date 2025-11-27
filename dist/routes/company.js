"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = companyRoutes;
const warnings_1 = require("../metering/company/warnings");
const COMPANY_DEFAULT_LIMIT = 50;
const COMPANY_MAX_LIMIT = 250;
async function companyRoutes(fastify) {
    /**
     * ---------------------------------------------------------
     * GET /v1/company
     * Company metadata + plan limits + usage + warnings
     * ---------------------------------------------------------
     */
    fastify.get('/v1/company', {
        config: {
            rateLimit: {
                max: 30,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth)
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        if (auth.scope !== 'COMPANY') {
            return reply
                .status(403)
                .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
        }
        const prisma = fastify.prisma;
        const company = await prisma.company.findUnique({
            where: { id: auth.companyId }
        });
        if (!company) {
            return reply.status(404).send({ error: 'COMPANY_NOT_FOUND' });
        }
        // Latest daily usage row
        const latestDaily = await prisma.usageStatsCompany.findFirst({
            where: { companyId: auth.companyId },
            orderBy: { date: 'desc' }
        });
        // Latest monthly EVENTS meter
        const latestEventsMeter = await prisma.billingMeterCompany.findFirst({
            where: { companyId: auth.companyId },
            orderBy: { periodStart: 'desc' }
        });
        // warnings (soft/hard)
        const warnings = await (0, warnings_1.getCompanyWarnings)(company.id);
        return reply.send({
            data: {
                company,
                limits: {
                    eventsPerMonth: company.eventsPerMonth,
                    exportsPerMonth: company.exportsPerMonth,
                    retentionDays: company.retentionDays,
                    unlimitedRetention: company.unlimitedRetention
                },
                usage: {
                    latestDaily,
                    latestEventsMeter,
                    warnings
                }
            }
        });
    });
    /**
     * ---------------------------------------------------------
     * GET /v1/company/workspaces
     * Paginated workspace listing
     * ---------------------------------------------------------
     */
    fastify.get('/v1/company/workspaces', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    cursor: { type: 'string' },
                    limit: { type: ['string', 'number'] }
                },
                additionalProperties: true
            }
        },
        config: {
            rateLimit: {
                max: 30,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth)
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        if (auth.scope !== 'COMPANY') {
            return reply
                .status(403)
                .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
        }
        const prisma = fastify.prisma;
        const rawLimit = request.query.limit;
        let limit = rawLimit !== undefined
            ? Number(rawLimit)
            : COMPANY_DEFAULT_LIMIT;
        limit = Math.min(Math.max(limit, 1), COMPANY_MAX_LIMIT);
        const cursor = request.query.cursor;
        const workspaces = await prisma.workspace.findMany({
            where: { companyId: auth.companyId },
            take: limit,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: { createdAt: 'asc' }
        });
        const nextCursor = workspaces.length === limit
            ? workspaces[workspaces.length - 1].id
            : null;
        return reply.send({
            data: workspaces,
            nextCursor
        });
    });
    /**
     * ---------------------------------------------------------
     * GET /v1/company/workspaces/:id
     * Fetch single workspace with optional usage
     * ---------------------------------------------------------
     */
    fastify.get('/v1/company/workspaces/:id', {
        config: {
            rateLimit: {
                max: 30,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth)
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        if (auth.scope !== 'COMPANY') {
            return reply
                .status(403)
                .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
        }
        const prisma = fastify.prisma;
        const { id } = request.params;
        const ws = await prisma.workspace.findUnique({
            where: { id }
        });
        if (!ws)
            return reply.status(404).send({ error: 'WORKSPACE_NOT_FOUND' });
        if (ws.companyId !== auth.companyId) {
            return reply.status(403).send({ error: 'FORBIDDEN' });
        }
        const latestDaily = await prisma.usageStatsWorkspace.findFirst({
            where: { companyId: auth.companyId, workspaceId: ws.id },
            orderBy: { date: 'desc' }
        });
        const latestEventsMeter = await prisma.billingMeterWorkspace.findFirst({
            where: {
                companyId: auth.companyId,
                workspaceId: ws.id
            },
            orderBy: { periodStart: 'desc' }
        });
        return reply.send({
            data: {
                workspace: ws,
                usage: {
                    latestDaily,
                    latestEventsMeter
                }
            }
        });
    });
    /**
     * ---------------------------------------------------------
     * GET /v1/company/usage
     * Fetch all meters + daily usage (90 days)
     * ---------------------------------------------------------
     */
    fastify.get('/v1/company/usage', {
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const auth = request.auth;
        if (!auth)
            return reply.status(401).send({ error: 'UNAUTHENTICATED' });
        if (auth.scope !== 'COMPANY') {
            return reply
                .status(403)
                .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
        }
        const prisma = fastify.prisma;
        const meters = await prisma.billingMeterCompany.findMany({
            where: { companyId: auth.companyId },
            orderBy: { periodStart: 'desc' }
        });
        const daily = await prisma.usageStatsCompany.findMany({
            where: { companyId: auth.companyId },
            orderBy: { date: 'desc' },
            take: 90
        });
        return reply.send({
            data: {
                meters,
                daily
            }
        });
    });
}
