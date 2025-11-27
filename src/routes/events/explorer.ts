// src/routes/events/explorer.ts
import { FastifyInstance } from 'fastify';
import { EventQuerySchema } from '../../schemas/events';
import { getCompanyLimits } from '../../lib/metering/helpers';

const WORKSPACE_DEFAULT_LIMIT = 200;
const WORKSPACE_MAX_LIMIT = 500;

const COMPANY_DEFAULT_LIMIT = 100;
const COMPANY_MAX_LIMIT = 250;

export default async function explorerRoutes(fastify: FastifyInstance) {
    fastify.get(
        '/v1/events',
        {
            config: {
                rateLimit: {
                    max: 60,
                    timeWindow: '1 minute'
                }
            }
        },
        async (request, reply) => {
            const api = request.auth;
            if (!api)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });

            const prisma = fastify.prisma;

            const parsed = EventQuerySchema.safeParse(request.query);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error);
            }

            const q = parsed.data;

            // Determine limit
            let limit =
                q.limit ??
                (api.scope === 'COMPANY'
                    ? COMPANY_DEFAULT_LIMIT
                    : WORKSPACE_DEFAULT_LIMIT);

            limit =
                api.scope === 'COMPANY'
                    ? Math.min(Math.max(limit, 1), COMPANY_MAX_LIMIT)
                    : Math.min(Math.max(limit, 1), WORKSPACE_MAX_LIMIT);

            const cursor = q.cursor ?? undefined;

            // Fetch retention limits
            const limits = await getCompanyLimits(api.companyId);

            const retentionCutoff = limits.unlimitedRetention
                ? null
                : new Date(
                      Date.now() - limits.retentionDays * 24 * 60 * 60 * 1000
                  );

            // Build base filter
            const where: any = {};

            // Workspace determination
            if (api.scope === 'WORKSPACE') {
                where.workspaceId = api.workspaceId!;
            } else if (q.workspaceId) {
                where.workspaceId = q.workspaceId;
            } else {
                // Company key: all workspaces under the company
                const wsList = await prisma.workspace.findMany({
                    where: { companyId: api.companyId },
                    select: { id: true }
                });
                where.workspaceId = { in: wsList.map((w) => w.id) };
            }

            // Apply retention
            if (retentionCutoff) {
                where.timestamp = { gte: retentionCutoff };
            }

            // Additional filters
            if (q.type) where.type = q.type;
            if (q.actorId) where.actorId = q.actorId;

            // Keyword search (`metadata` search will be improved later)
            if (q.q) {
                where.OR = [
                    { type: { contains: q.q, mode: 'insensitive' } },
                    { actorName: { contains: q.q, mode: 'insensitive' } }
                ];
            }

            const events = await prisma.event.findMany({
                where,
                take: limit,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy: { timestamp: 'desc' }
            });

            const nextCursor =
                events.length === limit ? events[events.length - 1].id : null;

            return reply.send({
                data: events,
                nextCursor
            });
        }
    );
}
