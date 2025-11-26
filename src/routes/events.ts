// src/routes/events.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { sha256 } from '../utils/crypto';

const eventSchema = z.object({
    type: z.string().min(1),
    timestamp: z.string().datetime().optional(),

    actor: z
        .object({
            id: z.string().optional(),
            type: z.string().optional(),
            name: z.string().optional(),
            email: z.string().email().optional()
        })
        .optional(),

    source: z
        .object({
            ip: z.string().optional(),
            userAgent: z.string().optional()
        })
        .optional(),

    // generic JSON
    metadata: z.record(z.string(), z.any()).optional(),
    before: z.record(z.string(), z.any()).optional().nullable(),
    after: z.record(z.string(), z.any()).optional().nullable()
});

export async function registerEventRoutes(fastify: FastifyInstance) {
    // Create event (requires API key)
    fastify.post(
        '/v1/events',
        { preHandler: fastify.authenticate },
        async (request, reply) => {
            const parseResult = eventSchema.safeParse(request.body);

            if (!parseResult.success) {
                reply.code(400).send({
                    error: 'Invalid body',
                    details: parseResult.error.flatten()
                });
                return;
            }

            const body = parseResult.data;
            const workspaceId = request.auth!.workspaceId;

            // Get previous event hash for this workspace
            const prev = await prisma.event.findFirst({
                where: { workspaceId },
                orderBy: { createdAt: 'desc' },
                select: { hash: true }
            });

            const prevHash = prev?.hash ?? null;
            const chainId = workspaceId;

            const ts = body.timestamp ? new Date(body.timestamp) : new Date();

            const canonical = {
                workspaceId,
                type: body.type,
                actorId: body.actor?.id ?? null,
                timestamp: ts.toISOString(),
                metadata: body.metadata ?? null,
                prevHash
            };

            const hash = sha256((prevHash ?? '') + JSON.stringify(canonical));

            const event = await prisma.event.create({
                data: {
                    workspaceId,
                    type: body.type,
                    timestamp: ts,
                    actorId: body.actor?.id ?? null,
                    actorType: body.actor?.type ?? null,
                    actorName: body.actor?.name ?? null,
                    actorEmail: body.actor?.email ?? null,
                    sourceIp: body.source?.ip ?? request.ip,
                    userAgent:
                        body.source?.userAgent ?? request.headers['user-agent'],

                    // Json fields: using `any` from Zod, fine for Prisma InputJsonValue union
                    metadata: body.metadata ?? undefined,
                    before: body.before ?? undefined,
                    after: body.after ?? undefined,

                    chainId,
                    hash,
                    prevHash
                }
            });

            reply.code(201).send({
                success: true,
                eventId: event.id,
                hash
            });
        }
    );

    // List events for the current workspace
    fastify.get(
        '/v1/events',
        { preHandler: fastify.authenticate },
        async (request, _reply) => {
            const workspaceId = request.auth!.workspaceId;
            const query = request.query as any;

            const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);

            const events = await prisma.event.findMany({
                where: { workspaceId },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return { data: events };
        }
    );
}
