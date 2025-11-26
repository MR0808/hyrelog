// src/routes/apiKeys.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateApiKey } from '../utils/apiKey';

const createApiKeySchema = z.object({
    workspaceId: z.string().cuid(),
    name: z.string().min(1)
});

export async function registerApiKeyRoutes(fastify: FastifyInstance) {
    // TODO: In production, protect these endpoints with your app's auth (Next.js session, JWT, etc.)

    // Create API key
    fastify.post('/v1/api-keys', async (request, reply) => {
        const parseResult = createApiKeySchema.safeParse(request.body);

        if (!parseResult.success) {
            reply.code(400).send({
                error: 'Invalid body',
                details: parseResult.error.flatten()
            });
            return;
        }

        const { workspaceId, name } = parseResult.data;

        // Ensure workspace exists
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { id: true }
        });

        if (!workspace) {
            reply.code(404).send({ error: 'Workspace not found' });
            return;
        }

        const { fullKey, prefix, hashed } = generateApiKey();

        const apiKey = await prisma.apiKey.create({
            data: {
                name,
                workspaceId,
                keyPrefix: prefix,
                hashedKey: hashed
            }
        });

        // Only show secret once
        reply.code(201).send({
            id: apiKey.id,
            name: apiKey.name,
            prefix: apiKey.keyPrefix,
            secret: fullKey,
            createdAt: apiKey.createdAt
        });
    });

    // List API keys for a workspace
    fastify.get('/v1/api-keys', async (request, reply) => {
        const workspaceId = (request.query as any).workspaceId as
            | string
            | undefined;

        if (!workspaceId) {
            reply
                .code(400)
                .send({ error: 'workspaceId query param is required' });
            return;
        }

        const apiKeys = await prisma.apiKey.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' }
        });

        return {
            data: apiKeys.map((k) => ({
                id: k.id,
                name: k.name,
                prefix: k.keyPrefix,
                createdAt: k.createdAt,
                lastUsedAt: k.lastUsedAt,
                revoked: k.revoked
            }))
        };
    });

    // Revoke API key
    fastify.delete('/v1/api-keys/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        const apiKey = await prisma.apiKey.update({
            where: { id },
            data: { revoked: true }
        });

        return {
            id: apiKey.id,
            revoked: apiKey.revoked
        };
    });
}
