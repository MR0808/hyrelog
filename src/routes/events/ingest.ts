// src/routes/events/ingest.ts

import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { EventIngestSchema } from '../../schemas/events';
import { computeEventHash } from '../../utils/hashchain';
import { toJson } from '../../utils/toJson';

const MAX_METADATA_BYTES = 25 * 1024; // 25KB
const MAX_EVENT_BYTES = 100 * 1024; // 100KB

export async function eventIngestRoutes(fastify: FastifyInstance) {
    fastify.post(
        '/v1/events',
        {
            // Workspace key only
            preHandler: [
                fastify.authenticate,
                fastify.enforceCompanyMeter('EVENTS') // Rate limit event ingestion
            ]
        },
        async (request, reply) => {
            const {
                scope,
                companyId,
                workspaceId: keyWorkspaceId
            } = request.auth!;

            // -------------------------------------
            // Only WORKSPACE key can ingest events
            // -------------------------------------
            if (scope !== 'WORKSPACE' || !keyWorkspaceId) {
                reply.code(403).send({
                    error: 'Only workspace API keys may create events'
                });
                return;
            }

            // -------------------------------------
            // Validate with Zod v4 (EventIngestSchema)
            // -------------------------------------
            const parsed = EventIngestSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400).send({ error: parsed.error.flatten() });
                return;
            }
            const eventData = parsed.data;

            // -------------------------------------
            // Validate workspace ownership
            // -------------------------------------
            const workspace = await prisma.workspace.findFirst({
                where: {
                    id: keyWorkspaceId,
                    companyId
                }
            });

            if (!workspace) {
                reply.code(404).send({ error: 'Workspace not found' });
                return;
            }

            // -------------------------------------
            // Validate payload size (SOC2 / ISO)
            // -------------------------------------
            const metaPayload = {
                metadata: eventData.metadata,
                before: eventData.before,
                after: eventData.after
            };

            const metaBytes = Buffer.byteLength(
                JSON.stringify(metaPayload),
                'utf8'
            );
            if (metaBytes > MAX_METADATA_BYTES) {
                reply
                    .code(413)
                    .send({ error: 'Metadata too large (25KB limit)' });
                return;
            }

            const fullBytes = Buffer.byteLength(
                JSON.stringify(eventData),
                'utf8'
            );
            if (fullBytes > MAX_EVENT_BYTES) {
                reply
                    .code(413)
                    .send({ error: 'Event payload too large (100KB limit)' });
                return;
            }

            // -------------------------------------
            // Build hash chain
            // -------------------------------------
            const last = await prisma.event.findFirst({
                where: { workspaceId: keyWorkspaceId },
                orderBy: { timestamp: 'desc' }
            });

            const prevHash = last?.hash ?? null;
            const chainId = last?.chainId ?? keyWorkspaceId;

            const hash = computeEventHash({
                workspaceId: keyWorkspaceId,
                ...eventData,
                chainId,
                prevHash
            });

            // -------------------------------------
            // Create event
            // -------------------------------------
            const created = await prisma.event.create({
                data: {
                    workspaceId: keyWorkspaceId,
                    type: eventData.type,

                    actorId: eventData.actorId,
                    actorType: eventData.actorType,
                    actorName: eventData.actorName,
                    actorEmail: eventData.actorEmail,

                    metadata: toJson(eventData.metadata),
                    before: toJson(eventData.before),
                    after: toJson(eventData.after),

                    chainId,
                    prevHash,
                    hash
                }
            });

            // -------------------------------------
            // Increment usage meter
            // -------------------------------------
            await fastify.incrementCompanyMeter(
                'EVENTS',
                companyId,
                keyWorkspaceId,
                1
            );

            reply.code(201).send({ data: created });
        }
    );
}
