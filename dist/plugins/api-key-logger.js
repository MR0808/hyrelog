"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/plugins/api-key-logger.ts
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const apiKeyLoggerPlugin = (0, fastify_plugin_1.default)(async function (fastify) {
    fastify.addHook('onResponse', async (request, reply) => {
        const auth = request.auth;
        if (!auth)
            return; // Only log authenticated requests
        const prisma = fastify.prisma;
        let durationMs = null;
        try {
            const start = request._startTime;
            if (start) {
                const end = process.hrtime.bigint();
                durationMs = Number(end - start) / 1000000;
            }
        }
        catch {
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
                    durationMs: durationMs !== null ? Math.round(durationMs) : null,
                    ip: request.ip,
                    userAgent: typeof request.headers['user-agent'] === 'string'
                        ? request.headers['user-agent']
                        : null
                }
            });
        }
        catch (err) {
            // Do not block the request on log failure
            fastify.log.error({ err, apiKeyId: auth.apiKeyId }, 'failed to persist ApiKeyLog');
        }
    });
});
exports.default = apiKeyLoggerPlugin;
