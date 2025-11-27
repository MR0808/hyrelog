"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaPlugin = void 0;
// src/plugins/prisma.ts
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../generated/prisma/client");
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
exports.prismaPlugin = (0, fastify_plugin_1.default)(async (fastify) => {
    const prisma = new client_1.PrismaClient({ adapter }); // <-- CORRECT for Prisma 7
    fastify.decorate('prisma', prisma);
    fastify.addHook('onClose', async () => {
        await prisma.$disconnect();
    });
});
