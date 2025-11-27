"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
// src/server.ts
const fastify_1 = __importDefault(require("fastify"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const prisma_1 = require("./plugins/prisma");
const api_key_auth_1 = __importDefault(require("./plugins/api-key-auth"));
const company_1 = __importDefault(require("./routes/company"));
const workspaces_1 = __importDefault(require("./routes/workspaces"));
const ingest_1 = __importDefault(require("./routes/events/ingest"));
const explorer_1 = __importDefault(require("./routes/events/explorer"));
const export_1 = __importDefault(require("./routes/events/export"));
// If you added webhook routes, keep this import; otherwise remove/comment.
// import webhookRoutes from './routes/webhooks';
function buildServer() {
    const app = (0, fastify_1.default)({
        logger: true
    });
    // -----------------------------
    // Core plugins
    // -----------------------------
    app.register(rate_limit_1.default, {
        global: false
    });
    app.register(cors_1.default, {
        origin: true
    });
    app.register(helmet_1.default);
    app.register(prisma_1.prismaPlugin);
    app.register(api_key_auth_1.default);
    // -----------------------------
    // Global API key auth for /v1/*
    // -----------------------------
    app.addHook('onRequest', async (request, reply) => {
        // onRequest runs before route is resolved; routeOptions.url may be undefined.
        // Use raw URL to decide which paths require auth.
        const url = request.raw.url || '';
        // Health endpoint is always public
        if (url.startsWith('/health'))
            return;
        // Require API key for all versioned API routes
        if (url.startsWith('/v1')) {
            await app.authenticate(request, reply);
        }
    });
    // -----------------------------
    // Routes
    // -----------------------------
    app.register(company_1.default);
    app.register(workspaces_1.default);
    app.register(ingest_1.default);
    app.register(explorer_1.default);
    app.register(export_1.default);
    // app.register(webhookRoutes);
    // Health check
    app.get('/health', async () => ({ status: 'ok' }));
    // -----------------------------
    // Centralized error handler
    // -----------------------------
    app.setErrorHandler((error, request, reply) => {
        const err = error;
        app.log.error({
            err,
            reqId: request.id,
            method: request.method,
            url: request.raw.url
        }, 'request error');
        const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
        const code = typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';
        reply.status(statusCode).send({
            error: err instanceof Error
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
exports.default = buildServer;
