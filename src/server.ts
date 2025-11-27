// src/server.ts
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';

import { prismaPlugin } from './plugins/prisma';
import apiKeyAuthPlugin from './plugins/api-key-auth';
import apiKeyLoggingPlugin from './plugins/api-key-logger';

// Core routes
import companyRoutes from './routes/company';
import workspaceRoutes from './routes/workspaces';

// Event routes
import ingestRoutes from './routes/events/ingest';
import explorerRoutes from './routes/events/explorer';
import exportRoutes from './routes/events/export';

// Webhook system routes
import companyWebhookRoutes from './routes/company-webhooks';
import companyWebhookDeliveryRoutes from './routes/company-webhook-deliveries';

export async function buildServer() {
    const fastify = Fastify({
        logger: {
            transport: {
                target: 'pino-pretty',
                options: { colorize: true }
            }
        }
    });

    // --- Core Plugins ---
    await fastify.register(cors, { origin: '*' });
    await fastify.register(rateLimit, { global: false });
    await fastify.register(prismaPlugin);
    await fastify.register(apiKeyAuthPlugin);
    await fastify.register(apiKeyLoggingPlugin);

    // --- Route Registration ---
    await fastify.register(companyRoutes);
    await fastify.register(workspaceRoutes);

    await fastify.register(ingestRoutes);
    await fastify.register(explorerRoutes);
    await fastify.register(exportRoutes);

    // --- NEW — Webhook System ---
    await fastify.register(companyWebhookRoutes);
    await fastify.register(companyWebhookDeliveryRoutes);

    // --- Error Handler ---
    fastify.setErrorHandler((err, request, reply) => {
        fastify.log.error(err);

        const status = (err as any).statusCode ?? 500;

        reply.status(status).send({
            error: (err as any).message ?? 'INTERNAL_ERROR',
            code: (err as any).code ?? 'INTERNAL_ERROR'
        });
    });

    return fastify;
}
