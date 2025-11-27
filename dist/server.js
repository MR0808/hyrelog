"use strict";
// src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const api_key_auth_1 = __importDefault(require("./plugins/api-key-auth"));
const usage_and_logging_1 = __importDefault(require("./plugins/usage-and-logging"));
const company_1 = require("./routes/company");
const workspaces_1 = require("./routes/workspaces");
const ingest_1 = require("./routes/events/ingest");
const explorer_1 = require("./routes/events/explorer");
const export_1 = require("./routes/events/export");
async function buildServer() {
    const fastify = (0, fastify_1.default)({
        logger: true
    });
    // ---------------------------
    // Security & middleware
    // ---------------------------
    await fastify.register(cors_1.default);
    await fastify.register(helmet_1.default);
    await fastify.register(api_key_auth_1.default);
    await fastify.register(usage_and_logging_1.default);
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
    await fastify.register(company_1.companyRoutes);
    await fastify.register(workspaces_1.workspaceRoutes);
    await fastify.register(ingest_1.eventIngestRoutes);
    await fastify.register(explorer_1.eventExplorerRoutes);
    await fastify.register(export_1.eventExportRoutes);
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
