import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

const apiKeyAuthPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.decorate('authenticate', async (request, reply) => {
        const apiKeyHeader = request.headers['x-api-key'];
        if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
            reply.code(401).send({ error: 'API key missing' });
            return;
        }

        const prefix = apiKeyHeader.slice(0, 10);

        const apiKey = await prisma.apiKey.findUnique({
            where: { keyPrefix: prefix },
            include: { company: true }
        });

        if (!apiKey || apiKey.revoked) {
            reply.code(401).send({ error: 'Invalid API key' });
            return;
        }

        const hashedInput = crypto
            .createHash('sha256')
            .update(apiKeyHeader)
            .digest('hex');

        if (hashedInput !== apiKey.hashedKey) {
            reply.code(401).send({ error: 'Invalid API key' });
            return;
        }

        request.auth = {
            apiKeyId: apiKey.id,
            scope: apiKey.scope === 'COMPANY' ? 'COMPANY' : 'WORKSPACE',
            companyId: apiKey.companyId,
            workspaceId: apiKey.workspaceId ?? null
        };

        await prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() }
        });
    });
};

export default fp(apiKeyAuthPlugin, { name: 'api-key-auth-plugin' });
