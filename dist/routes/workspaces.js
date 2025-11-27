"use strict";
// src/routes/workspaces.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceRoutes = workspaceRoutes;
const prisma_1 = require("../lib/prisma");
const COMPANY_DEFAULT_LIMIT = 50;
const COMPANY_MAX_LIMIT = 250;
async function workspaceRoutes(fastify) {
    fastify.get('/v1/workspaces', {
        preHandler: fastify.authenticate,
        config: {
            rateLimit: {
                max: 30,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const { scope, companyId, workspaceId: apiWorkspaceId } = request.auth;
        const q = request.query;
        // adjust rate limit per scope
        const cfg = request.routeOptions.config;
        if (cfg.rateLimit) {
            cfg.rateLimit.max = scope === 'WORKSPACE' ? 5 : 30;
        }
        // -----------------------
        // WORKSPACE SCOPED
        // -----------------------
        if (scope === 'WORKSPACE') {
            if (!apiWorkspaceId) {
                return reply.code(403).send({
                    error: 'Invalid workspace API key (missing workspaceId)'
                });
            }
            const ws = await prisma_1.prisma.workspace.findFirst({
                where: { id: apiWorkspaceId, companyId }
            });
            return reply.send({
                data: ws ? [ws] : [],
                pagination: {
                    total: ws ? 1 : 0,
                    limit: 1,
                    nextCursor: null
                }
            });
        }
        // -----------------------
        // COMPANY SCOPED
        // -----------------------
        const rawLimit = Number(q.limit ?? COMPANY_DEFAULT_LIMIT);
        const limit = Math.min(Math.max(rawLimit, 1), COMPANY_MAX_LIMIT);
        const cursor = q.cursor ? { id: q.cursor } : undefined;
        const batch = await prisma_1.prisma.workspace.findMany({
            where: { companyId },
            take: limit + 1,
            cursor,
            orderBy: { createdAt: 'desc' }
        });
        const hasMore = batch.length > limit;
        const items = hasMore ? batch.slice(0, limit) : batch;
        const nextCursor = hasMore ? items[items.length - 1].id : null;
        return reply.send({
            data: items,
            pagination: {
                limit,
                nextCursor
            }
        });
    });
    // --------------------------------------------------------
    // GET /v1/workspaces/:workspaceId
    // --------------------------------------------------------
    fastify.get('/v1/workspaces/:workspaceId', {
        preHandler: fastify.authenticate,
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const { scope, companyId, workspaceId: apiWorkspaceId } = request.auth;
        const { workspaceId } = request.params;
        const cfg = request.routeOptions.config;
        if (cfg.rateLimit) {
            cfg.rateLimit.max = scope === 'WORKSPACE' ? 5 : 20;
        }
        if (scope === 'WORKSPACE' && apiWorkspaceId !== workspaceId) {
            return reply.code(403).send({
                error: 'Forbidden: workspace API key cannot view other workspaces'
            });
        }
        const ws = await prisma_1.prisma.workspace.findFirst({
            where: { id: workspaceId, companyId }
        });
        if (!ws)
            return reply.code(404).send({ error: 'Workspace not found' });
        const eventCount = await prisma_1.prisma.event.count({
            where: { workspaceId }
        });
        const lastEvent = await prisma_1.prisma.event.findFirst({
            where: { workspaceId },
            orderBy: { timestamp: 'desc' }
        });
        return reply.send({
            data: {
                ...ws,
                stats: {
                    eventCount,
                    lastEventAt: lastEvent?.timestamp ?? null
                }
            }
        });
    });
}
