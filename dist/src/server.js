import fastify from 'fastify';
import sensible from '@fastify/sensible';
import { env, isProduction } from '@/config/env';
import { keyCompanyRoutes } from '@/routes/key.company';
import { keyCompanyEventsRoutes } from '@/routes/key.company.events';
import { keyCompanyUsageRoutes } from '@/routes/key.company.usage';
import { keyCompanyExportsRoutes } from '@/routes/key.company.exports';
import { keyCompanyArchiveRoutes } from '@/routes/key.company.archive';
import { keyCompanyGlobalRoutes } from '@/routes/key.company.global';
import { keyCompanyRegionsRoutes } from '@/routes/key.company.regions';
import { keyWorkspaceRoutes } from '@/routes/key.workspace';
import { keyWorkspaceEventsRoutes } from '@/routes/key.workspace.events';
import { keyWorkspaceExportsRoutes } from '@/routes/key.workspace.exports';
import { keyWorkspaceTailRoutes } from '@/routes/key.workspace.tail';
import { keyWorkspaceSchemasRoutes } from '@/routes/key.workspace.schemas'; // Phase 4: Schema Registry
import { keyWorkspaceRateLimitRoutes } from '@/routes/key.workspace.rate-limit'; // Phase 4: Rate Limits
import { keyCompanyRateLimitRoutes } from '@/routes/key.company.rate-limit'; // Phase 4: Rate Limits
import { keyWorkspaceLifecycleRoutes } from '@/routes/key.workspace.lifecycle'; // Phase 4: API Key Lifecycle
import { keyCompanyLifecycleRoutes } from '@/routes/key.company.lifecycle'; // Phase 4: API Key Lifecycle
import { internalMetricsRoutes } from '@/routes/internal.metrics';
import { internalHealthRoutes } from '@/routes/internal.health';
import { internalRegionHealthRoutes } from '@/routes/internal.region-health';
import { prisma } from '@/lib/prisma';
import { rateLimiter } from '@/lib/rateLimit';
import { buildOpenApiDocument } from '@/openapi/openapi';
import { initOtel } from '@/lib/otel';
import { startCronJobs } from '@/lib/cronScheduler';
const app = fastify({
    logger: {
        level: isProduction ? 'info' : 'debug'
    }
});
app.register(sensible);
app.addHook('onRequest', async (request, reply) => {
    request.requestStartTime = Date.now();
    const userAgentHeader = request.headers['user-agent'];
    request.requestMeta = {
        clientIp: request.ip,
        ...(typeof userAgentHeader === 'string'
            ? { userAgent: userAgentHeader }
            : {})
    };
    enforceRateLimit(request, `ip:${request.ip}`, env.RATE_LIMIT_PER_IP, reply);
    reply.header('x-request-id', request.id);
});
app.get('/healthz', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
}));
app.get('/openapi.json', async () => buildOpenApiDocument());
app.register(keyCompanyRoutes);
app.register(keyCompanyEventsRoutes);
app.register(keyCompanyUsageRoutes);
app.register(keyCompanyExportsRoutes);
app.register(keyCompanyArchiveRoutes);
app.register(keyCompanyGlobalRoutes);
app.register(keyCompanyRegionsRoutes);
app.register(keyWorkspaceRoutes);
app.register(keyWorkspaceEventsRoutes);
app.register(keyWorkspaceExportsRoutes);
app.register(keyWorkspaceTailRoutes);
app.register(keyWorkspaceSchemasRoutes); // Phase 4: Schema Registry
app.register(keyWorkspaceRateLimitRoutes); // Phase 4: Rate Limits
app.register(keyCompanyRateLimitRoutes); // Phase 4: Rate Limits
app.register(keyWorkspaceLifecycleRoutes); // Phase 4: API Key Lifecycle
app.register(keyCompanyLifecycleRoutes); // Phase 4: API Key Lifecycle
app.register(internalMetricsRoutes);
app.register(internalHealthRoutes);
app.register(internalRegionHealthRoutes);
app.addHook('onResponse', async (request, reply) => {
    // Add rate limit headers if API key context exists
    if (request.apiKeyContext) {
        const identifier = `key:${request.apiKeyContext.apiKey.id}`;
        const status = rateLimiter.getStatus(identifier);
        if (status) {
            reply.header('X-RateLimit-Limit', env.RATE_LIMIT_PER_KEY.toString());
            reply.header('X-RateLimit-Remaining', status.remaining.toString());
            reply.header('X-RateLimit-Reset', new Date(status.resetAt).toISOString());
        }
    }
    if (!request.apiKeyContext) {
        return;
    }
    const latency = request.requestStartTime
        ? Date.now() - request.requestStartTime
        : 0;
    const requestSize = Number(request.headers['content-length'] ?? 0);
    const responseSizeHeader = reply.getHeader('content-length');
    const responseSize = typeof responseSizeHeader === 'string'
        ? Number(responseSizeHeader)
        : typeof responseSizeHeader === 'number'
            ? responseSizeHeader
            : 0;
    await prisma.apiKeyLog.create({
        data: {
            apiKeyId: request.apiKeyContext.apiKey.id,
            companyId: request.apiKeyContext.company.id,
            workspaceId: request.apiKeyContext.workspace?.id ?? null,
            path: request.routeOptions?.url ?? request.url,
            method: request.method,
            statusCode: reply.statusCode,
            ip: request.requestMeta?.clientIp ?? request.ip,
            userAgent: request.requestMeta?.userAgent ?? null,
            latencyMs: latency,
            requestSizeBytes: Number.isFinite(requestSize) ? requestSize : 0,
            responseSizeBytes: Number.isFinite(responseSize) ? responseSize : 0
        }
    });
});
const enforceRateLimit = (request, identifier, limit, reply) => {
    const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
    const result = rateLimiter.consume(identifier, { limit, windowMs });
    if (result.limited) {
        if (reply && result.retryAfter) {
            reply.header('Retry-After', result.retryAfter.toString());
            reply.header('X-RateLimit-Limit', limit.toString());
            reply.header('X-RateLimit-Remaining', '0');
            reply.header('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
        }
        throw request.server.httpErrors.tooManyRequests('IP rate limit exceeded');
    }
    // Add rate limit headers to successful responses
    if (reply) {
        reply.header('X-RateLimit-Limit', limit.toString());
        reply.header('X-RateLimit-Remaining', result.remaining.toString());
        reply.header('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
    }
};
const start = async () => {
    try {
        // Initialize OpenTelemetry
        initOtel();
        // Start cron jobs
        startCronJobs();
        await app.listen({ port: env.PORT, host: env.HOST });
        app.log.info(`HyreLog Data API listening on ${env.HOST}:${env.PORT}`);
    }
    catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};
void start();
//# sourceMappingURL=server.js.map