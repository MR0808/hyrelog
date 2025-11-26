// src/plugins/auth.ts
import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import { hashKey } from '../utils/apiKey';

const authPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate(
        'authenticate',
        async (request: FastifyRequest, reply: FastifyReply) => {
            const authHeader = request.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                reply.code(401).send({ error: 'Missing API key' });
                return;
            }

            const apiKey = authHeader.substring('Bearer '.length).trim();
            const [prefix] = apiKey.split('.');

            if (!prefix) {
                reply.code(401).send({ error: 'Invalid API key format' });
                return;
            }

            const hashed = hashKey(apiKey);

            const keyRecord = await prisma.apiKey.findUnique({
                where: { keyPrefix: prefix }
            });

            if (
                !keyRecord ||
                keyRecord.hashedKey !== hashed ||
                keyRecord.revoked
            ) {
                reply.code(401).send({ error: 'Invalid API key' });
                return;
            }

            // Mark last used (fire & forget)
            void prisma.apiKey.update({
                where: { id: keyRecord.id },
                data: { lastUsedAt: new Date() }
            });

            request.auth = {
                workspaceId: keyRecord.workspaceId,
                apiKeyId: keyRecord.id
            };
        }
    );
};

export default fp(authPlugin);
