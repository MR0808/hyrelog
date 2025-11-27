// src/routes/events/ingest.ts
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

import { EventIngestSchema } from '../../schemas/events';
import { toJson } from '../../utils/toJson';
import { buildEventHash } from '../../utils/hashchain';

import { incrementCompanyDailyUsage } from '../../metering/daily-company';
import { incrementWorkspaceDailyUsage } from '../../metering/daily-workspace';
import { incrementCompanyMeter } from '../../metering/company/increment';
import { incrementWorkspaceMeter } from '../../metering/workspace/increment';
import { MeterType } from '../../generated/prisma/client';

import { enqueueWebhookDelivery } from '../../webhooks/dispatcher';

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

            // -------------------------------------------------
            // 1. Enforce company-wide EVENTS hard cap
            // -------------------------------------------------
            const company = await fastify.prisma.company.findUnique({
                where: { id: companyId }
            });

            if (!company) {
                return reply.status(404).send({ error: 'COMPANY_NOT_FOUND' });
            }

            if (!company.unlimitedRetention && company.eventsPerMonth > 0) {
                const now = new Date();
                const periodStart = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1
                );

                const meter =
                    await fastify.prisma.billingMeterCompany.findFirst({
                        where: {
                            companyId,
                            meterType: 'EVENTS',
                            periodStart
                        }
                    });

                const used = meter?.currentValue ?? 0;
                const cap = company.eventsPerMonth;

                if (used >= cap) {
                    return reply.status(429).send({
                        error: 'EVENT_LIMIT_REACHED',
                        used,
                        cap
                    });
                }
            }

            // -------------------------------------------------
            // 2. Validate payload
            // -------------------------------------------------
            const parsed = EventIngestSchema.safeParse(request.body);
            if (!parsed.success) {
                return reply.status(400).send(parsed.error);
            }

            const data = parsed.data;

            // -------------------------------------------------
            // 3. Get previous event hash for this workspace
            // -------------------------------------------------
            const prevEvent = await fastify.prisma.event.findFirst({
                where: { workspaceId },
                orderBy: { timestamp: 'desc' }
            });

            const prevHash: string | null = prevEvent?.hash ?? null;
            const chainId: string = prevEvent?.chainId ?? crypto.randomUUID();

            // -------------------------------------------------
            // 4. Build hash-chain value
            // -------------------------------------------------
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

            // -------------------------------------------------
            // 5. Persist event
            // -------------------------------------------------
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

            // -------------------------------------------------
            // 6. Webhook: EVENT_INGESTED (queued)
            // -------------------------------------------------
            enqueueWebhookDelivery(companyId, event).catch(() => {
                // swallow errors; ingestion should not fail due to webhook
            });

            // -------------------------------------------------
            // 7. Metering increments
            // -------------------------------------------------
            await incrementCompanyDailyUsage(companyId, 'eventsIngested');
            await incrementWorkspaceDailyUsage(
                companyId,
                workspaceId,
                'eventsIngested'
            );

            await incrementCompanyMeter(companyId, MeterType.EVENTS, 1);
            await incrementWorkspaceMeter(
                companyId,
                workspaceId,
                MeterType.EVENTS,
                1
            );

            return reply.status(201).send({ data: event });
        }
    );
}
