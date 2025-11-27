// src/routes/workspaces.ts
import { FastifyInstance } from 'fastify';

const WORKSPACE_DEFAULT_LIMIT = 200;
const WORKSPACE_MAX_LIMIT = 500;

const COMPANY_DEFAULT_LIMIT = 50;
const COMPANY_MAX_LIMIT = 250;

export default async function workspaceRoutes(fastify: FastifyInstance) {
    /**
     * ---------------------------------------------------------
     * GET /v1/workspaces
     * Company key → list all workspaces
     * Workspace key → only its own
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
                    }
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
            const api = request.auth;
            if (!api)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });

            const prisma = fastify.prisma;

            // Determine limit
            const limitInput = request.query.limit;
            let limit =
                limitInput !== undefined
                    ? Number(limitInput)
                    : api.scope === 'COMPANY'
                    ? COMPANY_DEFAULT_LIMIT
                    : WORKSPACE_DEFAULT_LIMIT;

            limit =
                api.scope === 'COMPANY'
                    ? Math.min(Math.max(limit, 1), COMPANY_MAX_LIMIT)
                    : Math.min(Math.max(limit, 1), WORKSPACE_MAX_LIMIT);

            const cursor = request.query.cursor;

            // COMPANY KEY
            if (api.scope === 'COMPANY') {
                const workspaces = await prisma.workspace.findMany({
                    where: { companyId: api.companyId },
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

            // WORKSPACE KEY — only its own workspace
            const ws = await prisma.workspace.findUnique({
                where: { id: api.workspaceId! }
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
     * Workspace key → only if :id matches
     * Company key → only if workspace belongs to company
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
            const api = request.auth;
            if (!api)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });

            const prisma = fastify.prisma;
            const id = (request.params as any).id as string;

            const ws = await prisma.workspace.findUnique({
                where: { id }
            });

            if (!ws) return reply.status(404).send({ error: 'NOT_FOUND' });

            if (api.scope === 'WORKSPACE' && api.workspaceId !== ws.id) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            if (api.scope === 'COMPANY' && ws.companyId !== api.companyId) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            return reply.send({ data: ws });
        }
    );
}
