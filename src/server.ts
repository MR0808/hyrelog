// src/server.ts
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import authPlugin from './plugins/auth';
import { registerWorkspaceRoutes } from './routes/workspaces';
import { registerApiKeyRoutes } from './routes/apiKeys';
import { registerEventRoutes } from './routes/events';

const server = Fastify({
    logger: true
});

async function buildServer() {
    // Core plugins
    await server.register(cors);
    await server.register(helmet);
    await server.register(rateLimit, {
        max: 1000,
        timeWindow: '1 minute'
    });

    // Auth (API key)
    await server.register(authPlugin);

    // Health check
    server.get('/health', async () => {
        return { status: 'ok' };
    });

    // Domain routes
    await registerWorkspaceRoutes(server);
    await registerApiKeyRoutes(server);
    await registerEventRoutes(server);

    return server;
}

async function start() {
    try {
        await buildServer();
        const port = Number(process.env.PORT) || 3000;

        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 Server listening on http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

start();
