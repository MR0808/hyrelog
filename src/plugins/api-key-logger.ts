// src/plugins/api-key-logger.ts
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

const apiKeyLoggerPlugin = fp(async function (fastify: FastifyInstance) {
    fastify.addHook('onResponse', async (request, reply) => {
        const auth = request.auth;
        if (!auth) return; // Only log authenticated requests

        const prisma = fastify.prisma;

        let durationMs: number | null = null;
        try {
            const start = (request as any)._startTime as bigint | undefined;
            if (start) {
                const end = process.hrtime.bigint();
                durationMs = Number(end - start) / 1_000_000;
            }
        } catch {
            durationMs = null;
        }

        try {
            await prisma.apiKeyLog.create({
                data: {
                    apiKeyId: auth.apiKeyId,
                    companyId: auth.companyId,
                    workspaceId: auth.workspaceId,

                    method: request.method,
                    path: request.url,
                    statusCode: reply.statusCode,
                    durationMs:
                        durationMs !== null ? Math.round(durationMs) : null,

                    ip: request.ip,
                    userAgent:
                        typeof request.headers['user-agent'] === 'string'
                            ? request.headers['user-agent']
                            : null
                }
            });
        } catch (err) {
            // Do not block the request on log failure
            fastify.log.error(
                { err, apiKeyId: auth.apiKeyId },
                'failed to persist ApiKeyLog'
            );
        }
    });
});

export default apiKeyLoggerPlugin;
