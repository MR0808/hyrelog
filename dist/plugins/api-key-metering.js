"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/plugins/api-key-metering.ts
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const increment_1 = require("../metering/company/increment");
const increment_2 = require("../metering/workspace/increment");
const client_1 = require("../generated/prisma/client");
const apiKeyMetering = (0, fastify_plugin_1.default)(async (fastify) => {
    fastify.addHook('onSend', async (request, reply, payload) => {
        const auth = request.auth;
        if (!auth)
            return;
        const { companyId, workspaceId } = auth;
        // Company-level metering for API requests
        await (0, increment_1.incrementCompanyMeter)(companyId, client_1.MeterType.USERS, 1);
        // Workspace-specific metering
        if (workspaceId) {
            await (0, increment_2.incrementWorkspaceMeter)(companyId, workspaceId, client_1.MeterType.USERS, 1);
        }
    });
});
exports.default = apiKeyMetering;
