"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const prisma_1 = require("../lib/prisma");
const crypto_1 = __importDefault(require("crypto"));
const apiKeyAuthPlugin = async (fastify) => {
    fastify.decorate('authenticate', async (request, reply) => {
        const apiKeyHeader = request.headers['x-api-key'];
        if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
            reply.code(401).send({ error: 'API key missing' });
            return;
        }
        const prefix = apiKeyHeader.slice(0, 10);
        const apiKey = await prisma_1.prisma.apiKey.findUnique({
            where: { keyPrefix: prefix },
            include: { company: true }
        });
        if (!apiKey || apiKey.revoked) {
            reply.code(401).send({ error: 'Invalid API key' });
            return;
        }
        const hashedInput = crypto_1.default
            .createHash('sha256')
            .update(apiKeyHeader)
            .digest('hex');
        if (hashedInput !== apiKey.hashedKey) {
            reply.code(401).send({ error: 'Invalid API key' });
            return;
        }
        request.auth = {
            apiKeyId: apiKey.id,
            scope: apiKey.scope === 'COMPANY' ? 'COMPANY' : 'WORKSPACE',
            companyId: apiKey.companyId,
            workspaceId: apiKey.workspaceId ?? null
        };
        await prisma_1.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() }
        });
    });
};
exports.default = (0, fastify_plugin_1.default)(apiKeyAuthPlugin, { name: 'api-key-auth-plugin' });
