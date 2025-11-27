// src/routes/events/ingest.ts
import { FastifyInstance } from 'fastify';
import { EventIngestSchema } from '../../schemas/events';
import { toJson } from '../../utils/toJson';
import { buildEventHash } from '../../utils/hashchain';
import { meterEventIngest } from '../../lib/metering';

export default async function ingestRoutes(fastify: FastifyInstance) {
    fastify.post(
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

            // Only workspace keys may ingest
            if (api.scope !== 'WORKSPACE') {
                return reply
                    .status(403)
                    .send({ error: 'COMPANY_KEY_CANNOT_INGEST' });
            }

            const parsed = EventIngestSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error);
            }

            const data = parsed.data;
            const workspaceId = api.workspaceId!;
            const prisma = fastify.prisma;

            // Fetch previous event for chain
            const prevEvent = await prisma.event.findFirst({
                where: { workspaceId },
                orderBy: { timestamp: 'desc' }
            });

            const prevHash = prevEvent?.hash ?? null;
            const chainId = prevEvent?.chainId ?? crypto.randomUUID();

            const hash = buildEventHash({
                type: data.type,
                actorId: data.actorId,
                actorType: data.actorType,
                actorName: data.actorName,
                actorEmail: data.actorEmail,
                metadata: data.metadata,
                before: data.before,
                after: data.after,
                prevHash
            });

            const event = await prisma.event.create({
                data: {
                    workspaceId,
                    type: data.type,

                    actorId: data.actorId ?? null,
                    actorType: data.actorType ?? null,
                    actorName: data.actorName ?? null,
                    actorEmail: data.actorEmail ?? null,

                    metadata: toJson(data.metadata),
                    before: toJson(data.before),
                    after: toJson(data.after),

                    chainId,
                    prevHash,
                    hash
                }
            });

            // Metering for this event
            await meterEventIngest(api.companyId, workspaceId);

            return reply.status(201).send({ data: event });
        }
    );
}
