// src/routes/company.ts
import { FastifyInstance } from 'fastify';
import { getCompanyLimits } from '../lib/metering/helpers';
import { meterExport } from '../lib/metering';

const COMPANY_DEFAULT_LIMIT = 50;
const COMPANY_MAX_LIMIT = 250;

export default async function companyRoutes(fastify: FastifyInstance) {
    /**
     * ---------------------------------------------------------
     * GET /v1/company
     * Company-level metadata + plan limits + usage summary
     * ---------------------------------------------------------
     */
    fastify.get(
        '/v1/company',
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

            if (api.scope !== 'COMPANY') {
                return reply
                    .status(403)
                    .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
            }

            const prisma = fastify.prisma;

            const company = await prisma.company.findUnique({
                where: { id: api.companyId }
            });

            if (!company) return reply.status(404).send({ error: 'NOT_FOUND' });

            const limits = await getCompanyLimits(api.companyId);

            return reply.send({
                data: {
                    company,
                    limits
                }
            });
        }
    );

    /**
     * ---------------------------------------------------------
     * GET /v1/company/workspaces
     * List all workspaces under company
     * ---------------------------------------------------------
     */
    fastify.get<{
        Querystring: {
            cursor?: string;
            limit?: string | number;
        };
    }>(
        '/v1/company/workspaces',
        {
            config: {
                rateLimit: {
                    max: 30,
                    timeWindow: '1 minute'
                }
            },
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        cursor: { type: 'string' },
                        limit: { type: ['string', 'number'] }
                    }
                }
            }
        },
        async (request, reply) => {
            const api = request.auth;
            if (!api)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });
            if (api.scope !== 'COMPANY') {
                return reply
                    .status(403)
                    .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
            }

            const prisma = fastify.prisma;

            const limitInput = request.query.limit;
            let limit =
                limitInput !== undefined
                    ? Number(limitInput)
                    : COMPANY_DEFAULT_LIMIT;

            limit = Math.min(Math.max(1, limit), COMPANY_MAX_LIMIT);

            const cursor = request.query.cursor;

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
    );

    /**
     * ---------------------------------------------------------
     * GET /v1/company/workspaces/:id
     * Detailed workspace info (company scoped)
     * ---------------------------------------------------------
     */
    fastify.get(
        '/v1/company/workspaces/:id',
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

            if (api.scope !== 'COMPANY') {
                return reply
                    .status(403)
                    .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
            }

            const prisma = fastify.prisma;

            const id = (request.params as any).id as string;

            const ws = await prisma.workspace.findUnique({
                where: { id }
            });

            if (!ws) return reply.status(404).send({ error: 'NOT_FOUND' });

            if (ws.companyId !== api.companyId) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            return reply.send({ data: ws });
        }
    );

    /**
     * ---------------------------------------------------------
     * GET /v1/company/usage
     * Returns metered usage (events, exports)
     * ---------------------------------------------------------
     */
    fastify.get(
        '/v1/company/usage',
        {
            config: {
                rateLimit: {
                    max: 20,
                    timeWindow: '1 minute'
                }
            }
        },
        async (request, reply) => {
            const api = request.auth;
            if (!api)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });

            if (api.scope !== 'COMPANY') {
                return reply
                    .status(403)
                    .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
            }

            const prisma = fastify.prisma;

            const usage = await prisma.billingMeter.findMany({
                where: { companyId: api.companyId },
                orderBy: { periodStart: 'desc' }
            });

            return reply.send({ data: usage });
        }
    );
}
