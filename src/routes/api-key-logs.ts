// src/routes/api-key-logs.ts
import { FastifyInstance } from 'fastify';

const COMPANY_LOGS_DEFAULT_LIMIT = 100;
const COMPANY_LOGS_MAX_LIMIT = 500;

const WORKSPACE_LOGS_DEFAULT_LIMIT = 100;
const WORKSPACE_LOGS_MAX_LIMIT = 500;

export default async function apiKeyLogRoutes(fastify: FastifyInstance) {
    /**
     * ---------------------------------------------------------
     * GET /v1/company/api-key-logs
     * Company-scoped API key log explorer (all workspaces)
     * ---------------------------------------------------------
     */
    fastify.get<{
        Querystring: {
            cursor?: string;
            limit?: string | number;
            status?: string | number;
            method?: string;
            from?: string;
            to?: string;
            apiKeyId?: string;
            path?: string;
            workspaceId?: string;
        };
    }>(
        '/v1/company/api-key-logs',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        cursor: { type: 'string' },
                        limit: { type: ['string', 'number'] },
                        status: { type: ['string', 'number'] },
                        method: { type: 'string' },
                        from: { type: 'string' },
                        to: { type: 'string' },
                        apiKeyId: { type: 'string' },
                        path: { type: 'string' },
                        workspaceId: { type: 'string' }
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
            if (auth.scope !== 'COMPANY') {
                return reply
                    .status(403)
                    .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
            }

            const prisma = fastify.prisma;
            const q = request.query;

            const rawLimit = q.limit;
            let limit =
                rawLimit !== undefined
                    ? Number(rawLimit)
                    : COMPANY_LOGS_DEFAULT_LIMIT;
            limit = Math.min(Math.max(limit, 1), COMPANY_LOGS_MAX_LIMIT);

            const cursor = q.cursor;

            const where: any = {
                companyId: auth.companyId
            };

            if (q.status !== undefined) {
                const statusNum = Number(q.status);
                if (!Number.isNaN(statusNum)) {
                    where.statusCode = statusNum;
                }
            }

            if (q.method) {
                where.method = q.method.toUpperCase();
            }

            if (q.apiKeyId) {
                where.apiKeyId = q.apiKeyId;
            }

            if (q.workspaceId) {
                where.workspaceId = q.workspaceId;
            }

            if (q.path) {
                where.path = {
                    contains: q.path,
                    mode: 'insensitive'
                };
            }

            if (q.from || q.to) {
                where.createdAt = {};
                if (q.from) {
                    const fromDate = new Date(q.from);
                    if (!Number.isNaN(fromDate.getTime())) {
                        where.createdAt.gte = fromDate;
                    }
                }
                if (q.to) {
                    const toDate = new Date(q.to);
                    if (!Number.isNaN(toDate.getTime())) {
                        where.createdAt.lte = toDate;
                    }
                }
            }

            const logs = await prisma.apiKeyLog.findMany({
                where,
                take: limit,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy: { createdAt: 'desc' }
            });

            const nextCursor =
                logs.length === limit ? logs[logs.length - 1].id : null;

            return reply.send({
                data: logs,
                nextCursor
            });
        }
    );

    /**
     * ---------------------------------------------------------
     * GET /v1/workspaces/:id/api-key-logs
     * Workspace-scoped log explorer (company or workspace key)
     * ---------------------------------------------------------
     */
    fastify.get<{
        Params: { id: string };
        Querystring: {
            cursor?: string;
            limit?: string | number;
            status?: string | number;
            method?: string;
            from?: string;
            to?: string;
            apiKeyId?: string;
            path?: string;
        };
    }>(
        '/v1/workspaces/:id/api-key-logs',
        {
            schema: {
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' }
                    },
                    required: ['id']
                },
                querystring: {
                    type: 'object',
                    properties: {
                        cursor: { type: 'string' },
                        limit: { type: ['string', 'number'] },
                        status: { type: ['string', 'number'] },
                        method: { type: 'string' },
                        from: { type: 'string' },
                        to: { type: 'string' },
                        apiKeyId: { type: 'string' },
                        path: { type: 'string' }
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
            const { id: workspaceId } = request.params;

            // Ensure workspace belongs to this company
            const workspace = await prisma.workspace.findUnique({
                where: { id: workspaceId }
            });

            if (!workspace) {
                return reply.status(404).send({ error: 'WORKSPACE_NOT_FOUND' });
            }

            if (
                auth.scope === 'WORKSPACE' &&
                auth.workspaceId !== workspaceId
            ) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            if (
                auth.scope === 'COMPANY' &&
                workspace.companyId !== auth.companyId
            ) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            const q = request.query;

            const rawLimit = q.limit;
            let limit =
                rawLimit !== undefined
                    ? Number(rawLimit)
                    : WORKSPACE_LOGS_DEFAULT_LIMIT;
            limit = Math.min(Math.max(limit, 1), WORKSPACE_LOGS_MAX_LIMIT);

            const cursor = q.cursor;

            const where: any = {
                companyId: workspace.companyId,
                workspaceId
            };

            if (q.status !== undefined) {
                const statusNum = Number(q.status);
                if (!Number.isNaN(statusNum)) {
                    where.statusCode = statusNum;
                }
            }

            if (q.method) {
                where.method = q.method.toUpperCase();
            }

            if (q.apiKeyId) {
                where.apiKeyId = q.apiKeyId;
            }

            if (q.path) {
                where.path = {
                    contains: q.path,
                    mode: 'insensitive'
                };
            }

            if (q.from || q.to) {
                where.createdAt = {};
                if (q.from) {
                    const fromDate = new Date(q.from);
                    if (!Number.isNaN(fromDate.getTime())) {
                        where.createdAt.gte = fromDate;
                    }
                }
                if (q.to) {
                    const toDate = new Date(q.to);
                    if (!Number.isNaN(toDate.getTime())) {
                        where.createdAt.lte = toDate;
                    }
                }
            }

            const logs = await prisma.apiKeyLog.findMany({
                where,
                take: limit,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy: { createdAt: 'desc' }
            });

            const nextCursor =
                logs.length === limit ? logs[logs.length - 1].id : null;

            return reply.send({
                data: logs,
                nextCursor
            });
        }
    );
}
