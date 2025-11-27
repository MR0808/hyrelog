// src/routes/workspaces.ts
import { FastifyInstance } from 'fastify';
import { getWorkspaceWarnings } from '../metering/workspace/warnings';

const WORKSPACE_DEFAULT_LIMIT = 200;
const WORKSPACE_MAX_LIMIT = 500;

const COMPANY_DEFAULT_LIMIT = 50;
const COMPANY_MAX_LIMIT = 250;

export default async function workspaceRoutes(fastify: FastifyInstance) {
    /**
     * ---------------------------------------------------------
     * GET /v1/workspaces
     * Company key → all workspaces
     * Workspace key → one workspace
     * ---------------------------------------------------------
     */
    fastify.get<{
        Querystring: {
            cursor?: string;
            limit?: string | number;
        };
    }>(
        '/v1/workspaces',
        {
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
        },
        async (request, reply) => {
            const auth = request.auth;
            if (!auth)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });

            const prisma = fastify.prisma;

            const rawLimit = request.query.limit;
            let limit =
                rawLimit !== undefined
                    ? Number(rawLimit)
                    : auth.scope === 'COMPANY'
                    ? COMPANY_DEFAULT_LIMIT
                    : WORKSPACE_DEFAULT_LIMIT;

            limit =
                auth.scope === 'COMPANY'
                    ? Math.min(Math.max(limit, 1), COMPANY_MAX_LIMIT)
                    : Math.min(Math.max(limit, 1), WORKSPACE_MAX_LIMIT);

            const cursor = request.query.cursor;

            if (auth.scope === 'COMPANY') {
                const workspaces = await prisma.workspace.findMany({
                    where: { companyId: auth.companyId },
                    take: limit,
                    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                    orderBy: { createdAt: 'asc' }
                });

                const nextCursor =
                    workspaces.length === limit
                        ? workspaces[workspaces.length - 1].id
                        : null;

                return reply.send({
                    data: workspaces,
                    nextCursor
                });
            }

            // Workspace scoped: only its own workspace
            const ws = await prisma.workspace.findUnique({
                where: { id: auth.workspaceId! }
            });

            return reply.send({
                data: ws ? [ws] : [],
                nextCursor: null
            });
        }
    );

    /**
     * ---------------------------------------------------------
     * GET /v1/workspaces/:id
     * Scoping rules applied
     * ---------------------------------------------------------
     */
    fastify.get(
        '/v1/workspaces/:id',
        {
            config: {
                rateLimit: {
                    max: 30,
                    timeWindow: '1 minute'
                }
            }
        },
        async (request, reply) => {
            const auth = request.auth;
            if (!auth)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });

            const prisma = fastify.prisma;
            const { id } = request.params as { id: string };

            const ws = await prisma.workspace.findUnique({
                where: { id }
            });

            if (!ws)
                return reply.status(404).send({ error: 'WORKSPACE_NOT_FOUND' });

            if (auth.scope === 'WORKSPACE' && auth.workspaceId !== ws.id) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            if (auth.scope === 'COMPANY' && ws.companyId !== auth.companyId) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            const latestDaily = await prisma.usageStatsWorkspace.findFirst({
                where: {
                    companyId: ws.companyId,
                    workspaceId: ws.id
                },
                orderBy: { date: 'desc' }
            });

            const latestEventsMeter =
                await prisma.billingMeterWorkspace.findFirst({
                    where: {
                        companyId: ws.companyId,
                        workspaceId: ws.id
                    },
                    orderBy: { periodStart: 'desc' }
                });

            const warnings = await getWorkspaceWarnings(ws.companyId, ws.id);

            return reply.send({
                data: {
                    workspace: ws,
                    usage: {
                        latestDaily,
                        latestEventsMeter,
                        warnings
                    }
                }
            });
        }
    );

    /**
     * ---------------------------------------------------------
     * GET /v1/workspaces/:id/usage
     * Workspace usage snapshot (90 days)
     * ---------------------------------------------------------
     */
    fastify.get(
        '/v1/workspaces/:id/usage',
        {
            config: {
                rateLimit: {
                    max: 30,
                    timeWindow: '1 minute'
                }
            }
        },
        async (request, reply) => {
            const auth = request.auth;
            if (!auth)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });

            const prisma = fastify.prisma;
            const { id } = request.params as { id: string };

            const ws = await prisma.workspace.findUnique({
                where: { id }
            });

            if (!ws) {
                return reply.status(404).send({ error: 'WORKSPACE_NOT_FOUND' });
            }

            if (auth.scope === 'WORKSPACE' && auth.workspaceId !== id) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            if (auth.scope === 'COMPANY' && ws.companyId !== auth.companyId) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            const meters = await prisma.billingMeterWorkspace.findMany({
                where: {
                    companyId: ws.companyId,
                    workspaceId: ws.id
                },
                orderBy: { periodStart: 'desc' }
            });

            const daily = await prisma.usageStatsWorkspace.findMany({
                where: {
                    companyId: ws.companyId,
                    workspaceId: ws.id
                },
                orderBy: { date: 'desc' },
                take: 90
            });

            const warnings = await getWorkspaceWarnings(ws.companyId, ws.id);

            return reply.send({
                data: {
                    workspace: ws,
                    meters,
                    daily,
                    warnings
                }
            });
        }
    );
}
