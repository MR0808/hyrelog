// src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import crypto from 'crypto';

// Plugins
import { prismaPlugin } from './plugins/prisma';
import apiKeyAuthPlugin from './plugins/api-key-auth';
import apiKeyLoggerPlugin from './plugins/api-key-logger';

// Routes
import companyRoutes from './routes/company';
import workspaceRoutes from './routes/workspaces';
import ingestRoutes from './routes/events/ingest';
import explorerRoutes from './routes/events/explorer';
import exportRoutes from './routes/events/export';

export async function buildServer() {
    const fastify = Fastify({
        logger: {
            level: 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            }
        },
        genReqId: () => crypto.randomUUID()
    });

    // Attach a trace ID to each request (for distributed tracing later)
    fastify.addHook('onRequest', async (request, reply) => {
        request.headers['x-trace-id'] =
            request.headers['x-trace-id'] ?? crypto.randomUUID();

        reply.header('x-trace-id', request.headers['x-trace-id']);
    });

    // Capture start time for duration logging
    fastify.addHook('onRequest', async (request) => {
        (request as any)._startTime = process.hrtime.bigint();
    });

    fastify.addHook('onResponse', async (request, reply) => {
        try {
            const start = (request as any)._startTime as bigint;
            const end = process.hrtime.bigint();
            const durationMs = Number(end - start) / 1_000_000;

            fastify.log.info(
                {
                    reqId: request.id,
                    traceId: request.headers['x-trace-id'],
                    method: request.method,
                    url: request.url,
                    status: reply.statusCode,
                    durationMs: durationMs.toFixed(2)
                },
                'request completed'
            );
        } catch (_) {
            // no-op
        }
    });

    // Core security middleware
    await fastify.register(cors);
    await fastify.register(helmet);

    // Global rate limiting (per IP)
    await fastify.register(rateLimit, {
        max: 300,
        timeWindow: '1 minute',
        allowList: ['127.0.0.1']
    });

    // Prisma DB
    fastify.register(prismaPlugin);

    // API key authentication middleware
    fastify.register(apiKeyAuthPlugin);

    // Key Logger
    fastify.register(apiKeyLoggerPlugin);

    // ---- ROUTES ----
    fastify.register(companyRoutes);
    fastify.register(workspaceRoutes);
    fastify.register(ingestRoutes);
    fastify.register(explorerRoutes);
    fastify.register(exportRoutes);

    // ---- ERROR HANDLER ----
    fastify.setErrorHandler((err: unknown, request, reply) => {
        const error = err as Record<string, any>;

        const statusCode =
            typeof error.statusCode === 'number' ? error.statusCode : 500;

        const normalized = {
            statusCode,
            message:
                typeof error.message === 'string'
                    ? error.message
                    : 'Internal Server Error',
            code:
                typeof error.code === 'string' ? error.code : 'INTERNAL_ERROR',
            traceId: request.headers['x-trace-id'],
            requestId: request.id
        };

        // Log securely (PII-safe)
        fastify.log.error(
            {
                error: normalized,
                stack: error.stack,
                method: request.method,
                url: request.url,
                scope: request.auth?.scope,
                apiKeyId: request.auth?.apiKeyId
            },
            'unhandled error'
        );

        return reply.status(statusCode).send(normalized);
    });

    // ---- NOT FOUND HANDLER ----
    fastify.setNotFoundHandler((request, reply) => {
        const traceId = request.headers['x-trace-id'];
        reply.status(404).send({
            error: 'NOT_FOUND',
            message: 'Route not found',
            traceId
        });
    });

    return fastify;
}

// ---- STANDALONE BOOTSTRAP ----
if (require.main === module) {
    buildServer()
        .then((app) =>
            app.listen({ port: 3001, host: '0.0.0.0' }).then(() => {
                app.log.info('HyreLog API server started on port 3001');
            })
        )
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
