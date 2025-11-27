// src/routes/events/ingest.ts
import { FastifyInstance } from 'fastify';
import { EventIngestSchema } from '../../schemas/events';
import { toJson } from '../../utils/toJson';
import { buildEventHash } from '../../utils/hashchain';
import { incrementCompanyDailyUsage } from '../../metering/daily-company';
import { incrementWorkspaceDailyUsage } from '../../metering/daily-workspace';
import { incrementCompanyMonthlyMeter } from '../../metering/monthly-company';
import { incrementWorkspaceMonthlyMeter } from '../../metering/monthly-workspace';
import { enforceEventLimit } from '../../metering/enforce';
import { MeterType } from '../../generated/prisma/client';
import { enqueueWebhookDelivery } from '../../webhooks/dispatcher';
import crypto from 'crypto';

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
            const auth = request.auth;

            if (!auth || auth.scope !== 'WORKSPACE') {
                return reply
                    .status(403)
                    .send({ error: 'WORKSPACE_API_KEY_REQUIRED' });
            }

            const companyId = auth.companyId;
            const workspaceId = auth.workspaceId!;

            //
            // -----------------------------------------------------
            // 1. EVENT LIMIT ENFORCEMENT (NEW)
            // -----------------------------------------------------
            //
            const limit = await enforceEventLimit(companyId, workspaceId);

            if (!limit.allowed) {
                return reply.status(429).send({
                    error: 'EVENT_LIMIT_REACHED',
                    used: limit.used,
                    cap: limit.cap
                });
            }

            //
            // -----------------------------------------------------
            // 2. Validate event payload
            // -----------------------------------------------------
            //
            const parsed = EventIngestSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error);
            }

            const data = parsed.data;

            //
            // -----------------------------------------------------
            // 3. Fetch previous event hash
            // -----------------------------------------------------
            //
            const prevEvent = await fastify.prisma.event.findFirst({
                where: { workspaceId },
                orderBy: { timestamp: 'desc' }
            });

            const prevHash: string | null = prevEvent?.hash ?? null;
            const chainId: string = prevEvent?.chainId ?? crypto.randomUUID();

            //
            // -----------------------------------------------------
            // 4. Build new hash
            // -----------------------------------------------------
            //
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

            //
            // -----------------------------------------------------
            // 5. Create event
            // -----------------------------------------------------
            //
            const event = await fastify.prisma.event.create({
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

            //
            // -----------------------------------------------------
            // 6. Webhook delivery queued
            // -----------------------------------------------------
            //
            enqueueWebhookDelivery(companyId, event).catch(() => {});

            //
            // -----------------------------------------------------
            // 7. Metering increments
            // -----------------------------------------------------
            //
            await incrementCompanyDailyUsage(companyId, 'eventsIngested');
            await incrementWorkspaceDailyUsage(
                companyId,
                workspaceId,
                'eventsIngested'
            );

            await incrementCompanyMonthlyMeter(companyId, MeterType.EVENTS);
            await incrementWorkspaceMonthlyMeter(
                companyId,
                workspaceId,
                MeterType.EVENTS
            );

            return reply.status(201).send({ data: event });
        }
    );
}
