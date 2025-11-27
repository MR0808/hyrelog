// src/plugins/api-key-logger.ts
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

interface TimingStore {
    start: bigint;
}

const apiKeyLoggerPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('onRequest', async (request) => {
        // Capture start time for duration calculation
        (request as any)._logTiming = {
            start: process.hrtime.bigint()
        } satisfies TimingStore;
    });

    fastify.addHook('onResponse', async (request, reply) => {
        const timing = (request as any)._logTiming as TimingStore | undefined;
        if (!timing) return;

        const durationNs = process.hrtime.bigint() - timing.start;
        const durationMs = Number(durationNs) / 1_000_000;

        const auth = request.auth;

        // Only log API-key authenticated requests
        if (!auth?.apiKeyId) return;

        try {
            await fastify.prisma.apiKeyLog.create({
                data: {
                    apiKeyId: auth.apiKeyId,
                    companyId: auth.companyId,
                    workspaceId: auth.workspaceId ?? null,

                    method: request.method,
                    path: request.url,
                    statusCode: reply.statusCode,
                    durationMs: Math.round(durationMs),

                    ip: request.ip,
                    userAgent: request.headers['user-agent'] ?? null
                }
            });
        } catch (err) {
            // We NEVER throw here. Logging must not break the API.
            fastify.log.error(
                {
                    err,
                    apiKeyId: auth.apiKeyId,
                    path: request.url
                },
                'failed to write ApiKeyLog'
            );
        }
    });
};

export default fp(apiKeyLoggerPlugin, {
    name: 'api-key-logger-plugin'
});
