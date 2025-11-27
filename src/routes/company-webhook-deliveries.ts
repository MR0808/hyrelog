// src/routes/company-webhook-deliveries.ts
import { FastifyInstance } from 'fastify';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export default async function companyWebhookDeliveryRoutes(
    fastify: FastifyInstance
) {
    /**
     * ---------------------------------------------------------------------
     * GET /v1/company/webhook/deliveries
     * Paginated list of webhook delivery attempts
     * ---------------------------------------------------------------------
     */
    fastify.get<{
        Querystring: {
            cursor?: string;
            limit?: string | number;
            status?: string;
            eventId?: string;
            from?: string;
            to?: string;
        };
    }>(
        '/v1/company/webhook/deliveries',
        {
            config: {
                rateLimit: { max: 30, timeWindow: '1 minute' }
            }
        },
        async (request, reply) => {
            const auth = request.auth;
            if (!auth)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });
            if (auth.scope !== 'COMPANY')
                return reply.status(403).send({ error: 'FORBIDDEN' });

            const prisma = fastify.prisma;

            let { cursor, limit, status, eventId, from, to } = request.query;

            let take = limit ? Number(limit) : DEFAULT_LIMIT;
            take = Math.min(Math.max(take, 1), MAX_LIMIT);

            const where: any = { companyId: auth.companyId };

            if (status) where.status = status.toUpperCase();
            if (eventId) where.eventId = eventId;

            if (from)
                where.createdAt = {
                    ...(where.createdAt || {}),
                    gte: new Date(from)
                };
            if (to)
                where.createdAt = {
                    ...(where.createdAt || {}),
                    lte: new Date(to)
                };

            const deliveries = await prisma.webhookDelivery.findMany({
                where,
                take,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy: { createdAt: 'desc' }
            });

            const nextCursor =
                deliveries.length === take
                    ? deliveries[deliveries.length - 1].id
                    : null;

            return reply.send({
                data: deliveries,
                nextCursor
            });
        }
    );

    /**
     * ---------------------------------------------------------------------
     * GET /v1/company/webhook/deliveries/:id
     * Single delivery information
     * ---------------------------------------------------------------------
     */
    fastify.get(
        '/v1/company/webhook/deliveries/:id',
        {
            config: {
                rateLimit: { max: 30, timeWindow: '1 minute' }
            }
        },
        async (request, reply) => {
            const auth = request.auth;
            if (!auth)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });
            if (auth.scope !== 'COMPANY')
                return reply.status(403).send({ error: 'FORBIDDEN' });

            const prisma = fastify.prisma;
            const id = (request.params as any).id as string;

            const delivery = await prisma.webhookDelivery.findUnique({
                where: { id }
            });

            if (!delivery || delivery.companyId !== auth.companyId) {
                return reply.status(404).send({ error: 'NOT_FOUND' });
            }

            return reply.send({ data: delivery });
        }
    );
}
