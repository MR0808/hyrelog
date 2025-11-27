// src/routes/company-webhook-events.ts
import { FastifyInstance } from 'fastify';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Webhook Event Explorer
 * Company-scoped only.
 *
 * Endpoints:
 *  - GET /v1/company/webhooks/events
 *  - GET /v1/company/webhooks/events/:id
 */
export default async function companyWebhookEventRoutes(
    fastify: FastifyInstance
) {
    /**
     * ---------------------------------------------------------
     * GET /v1/company/webhooks/events
     * Paginated list of webhook deliveries for this company
     * ---------------------------------------------------------
     */
    fastify.get<{
        Querystring: {
            cursor?: string;
            limit?: string | number;
            status?: string;
            eventId?: string;
        };
    }>(
        '/v1/company/webhooks/events',
        {
            config: {
                rateLimit: {
                    max: 20,
                    timeWindow: '1 minute'
                }
            },
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        cursor: { type: 'string' },
                        limit: { type: ['string', 'number'] },
                        status: { type: 'string' },
                        eventId: { type: 'string' }
                    },
                    additionalProperties: true
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

            const limitInput = request.query.limit;
            let limit =
                limitInput !== undefined ? Number(limitInput) : DEFAULT_LIMIT;
            limit = Math.min(Math.max(1, limit), MAX_LIMIT);

            const cursor = request.query.cursor;
            const status = request.query.status;
            const eventId = request.query.eventId;

            const deliveries = await prisma.webhookDelivery.findMany({
                where: {
                    companyId: auth.companyId,
                    ...(status ? { status } : {}),
                    ...(eventId ? { eventId } : {})
                },
                take: limit,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                orderBy: { createdAt: 'desc' }
            });

            const nextCursor =
                deliveries.length === limit
                    ? deliveries[deliveries.length - 1].id
                    : null;

            return reply.send({
                data: deliveries,
                nextCursor
            });
        }
    );

    /**
     * ---------------------------------------------------------
     * GET /v1/company/webhooks/events/:id
     * Fetch a single webhook delivery
     * ---------------------------------------------------------
     */
    fastify.get(
        '/v1/company/webhooks/events/:id',
        {
            config: {
                rateLimit: {
                    max: 20,
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
            const id = (request.params as any).id as string;

            const delivery = await prisma.webhookDelivery.findUnique({
                where: { id },
                include: { event: true }
            });

            if (!delivery)
                return reply
                    .status(404)
                    .send({ error: 'WEBHOOK_DELIVERY_NOT_FOUND' });

            if (delivery.companyId !== auth.companyId) {
                return reply.status(403).send({ error: 'FORBIDDEN' });
            }

            return reply.send({ data: delivery });
        }
    );
}
