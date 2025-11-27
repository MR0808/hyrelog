// src/server.ts
import fastify, { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import { prismaPlugin } from './plugins/prisma';
import apiKeyAuthPlugin from './plugins/api-key-auth';

import companyRoutes from './routes/company';
import workspaceRoutes from './routes/workspaces';
import ingestRoutes from './routes/events/ingest';
import explorerRoutes from './routes/events/explorer';
import exportRoutes from './routes/events/export';
// If you added webhook routes, keep this import; otherwise remove/comment.
// import webhookRoutes from './routes/webhooks';

export function buildServer(): FastifyInstance {
    const app = fastify({
        logger: true
    });

    // -----------------------------
    // Core plugins
    // -----------------------------
    app.register(rateLimit, {
        global: false
    });

    app.register(cors, {
        origin: true
    });

    app.register(helmet);

    app.register(prismaPlugin);
    app.register(apiKeyAuthPlugin);

    // -----------------------------
    // Global API key auth for /v1/*
    // -----------------------------
    app.addHook('onRequest', async (request, reply) => {
        // onRequest runs before route is resolved; routeOptions.url may be undefined.
        // Use raw URL to decide which paths require auth.
        const url = request.raw.url || '';

        // Health endpoint is always public
        if (url.startsWith('/health')) return;

        // Require API key for all versioned API routes
        if (url.startsWith('/v1')) {
            await app.authenticate(request, reply);
        }
    });

    // -----------------------------
    // Routes
    // -----------------------------
    app.register(companyRoutes);
    app.register(workspaceRoutes);
    app.register(ingestRoutes);
    app.register(explorerRoutes);
    app.register(exportRoutes);
    // app.register(webhookRoutes);

    // Health check
    app.get('/health', async () => ({ status: 'ok' }));

    // -----------------------------
    // Centralized error handler
    // -----------------------------
    app.setErrorHandler((error, request, reply) => {
        const err = error as any;

        app.log.error(
            {
                err,
                reqId: request.id,
                method: request.method,
                url: request.raw.url
            },
            'request error'
        );

        const statusCode =
            typeof err.statusCode === 'number' ? err.statusCode : 500;
        const code = typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';

        reply.status(statusCode).send({
            error:
                err instanceof Error
                    ? err.message
                    : 'An unknown error occurred',
            code
        });
    });

    return app;
}

// Standalone start
if (require.main === module) {
    const app = buildServer();
    const port = Number(process.env.PORT) || 3000;

    app.listen({ port, host: '0.0.0.0' })
        .then(() => {
            app.log.info({ port }, 'HyreLog API server started');
        })
        .catch((err) => {
            app.log.error(err, 'Failed to start HyreLog server');
            process.exit(1);
        });
}

export default buildServer;
