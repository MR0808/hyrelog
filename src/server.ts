// src/server.ts

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import apiKeyAuth from './plugins/api-key-auth';
import usagePlugin from './plugins/usage-and-logging';

import { companyRoutes } from './routes/company';
import { workspaceRoutes } from './routes/workspaces';
import { eventIngestRoutes } from './routes/events/ingest';
import { eventExplorerRoutes } from './routes/events/explorer';
import { eventExportRoutes } from './routes/events/export';

export async function buildServer() {
    const fastify = Fastify({
        logger: true
    });

    // ---------------------------
    // Security & middleware
    // ---------------------------
    await fastify.register(cors);
    await fastify.register(helmet);

    await fastify.register(apiKeyAuth);
    await fastify.register(usagePlugin);

    // Track response time for ApiKeyLog
    fastify.addHook('onRequest', async (req) => {
        req.startTime = Date.now();
    });

    fastify.addHook('onResponse', async (req, reply) => {
        const end = Date.now();
        const duration = req.startTime ? end - req.startTime : 0;
        await fastify.logApiKeyRequest(req, reply, duration);
    });

    // ---------------------------
    // Route registration
    // ---------------------------
    await fastify.register(companyRoutes);
    await fastify.register(workspaceRoutes);
    await fastify.register(eventIngestRoutes);
    await fastify.register(eventExplorerRoutes);
    await fastify.register(eventExportRoutes);

    return fastify;
}

// ---------------------------------------------
// Start server if running directly
// ---------------------------------------------
if (require.main === module) {
    (async () => {
        const app = await buildServer();
        app.listen({ port: 3001 }, (err) => {
            if (err) {
                console.error(err);
                process.exit(1);
            }
            console.log('HyreLog Data API running at http://localhost:3001');
        });
    })();
}
