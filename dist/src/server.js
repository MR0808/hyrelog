import fastify from "fastify";
import sensible from "@fastify/sensible";
import { env, isProduction } from "@/config/env";
import { keyCompanyRoutes } from "@/routes/key.company";
import { keyCompanyEventsRoutes } from "@/routes/key.company.events";
import { keyCompanyUsageRoutes } from "@/routes/key.company.usage";
import { keyWorkspaceRoutes } from "@/routes/key.workspace";
import { keyWorkspaceEventsRoutes } from "@/routes/key.workspace.events";
import { prisma } from "@/lib/prisma";
import { rateLimiter } from "@/lib/rateLimit";
import { buildOpenApiDocument } from "@/openapi/openapi";
const app = fastify({
    logger: {
        level: isProduction ? "info" : "debug",
    },
});
app.register(sensible);
app.addHook("onRequest", async (request, reply) => {
    request.requestStartTime = Date.now();
    const userAgentHeader = request.headers["user-agent"];
    request.requestMeta = {
        clientIp: request.ip,
        ...(typeof userAgentHeader === "string" ? { userAgent: userAgentHeader } : {}),
    };
    enforceRateLimit(request, `ip:${request.ip}`, env.RATE_LIMIT_PER_IP);
    reply.header("x-request-id", request.id);
});
app.get("/healthz", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
}));
app.get("/openapi.json", async () => buildOpenApiDocument());
app.register(keyCompanyRoutes);
app.register(keyCompanyEventsRoutes);
app.register(keyCompanyUsageRoutes);
app.register(keyWorkspaceRoutes);
app.register(keyWorkspaceEventsRoutes);
app.addHook("onResponse", async (request, reply) => {
    if (!request.apiKeyContext) {
        return;
    }
    const latency = request.requestStartTime ? Date.now() - request.requestStartTime : 0;
    const requestSize = Number(request.headers["content-length"] ?? 0);
    const responseSizeHeader = reply.getHeader("content-length");
    const responseSize = typeof responseSizeHeader === "string"
        ? Number(responseSizeHeader)
        : typeof responseSizeHeader === "number"
            ? responseSizeHeader
            : 0;
    await prisma.apiKeyLog.create({
        data: {
            apiKeyId: request.apiKeyContext.apiKey.id,
            companyId: request.apiKeyContext.company.id,
            workspaceId: request.apiKeyContext.workspace?.id,
            path: request.routeOptions?.url ?? request.url,
            method: request.method,
            statusCode: reply.statusCode,
            ip: request.requestMeta?.clientIp ?? request.ip,
            userAgent: request.requestMeta?.userAgent,
            latencyMs: latency,
            requestSizeBytes: Number.isFinite(requestSize) ? requestSize : 0,
            responseSizeBytes: Number.isFinite(responseSize) ? responseSize : 0,
        },
    });
});
const enforceRateLimit = (request, identifier, limit) => {
    const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
    const result = rateLimiter.consume(identifier, { limit, windowMs });
    if (result.limited) {
        throw request.server.httpErrors.tooManyRequests("IP rate limit exceeded");
    }
};
const start = async () => {
    try {
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