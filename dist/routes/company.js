"use strict";
// src/routes/company.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRoutes = companyRoutes;
const prisma_1 = require("../lib/prisma");
async function companyRoutes(fastify) {
    fastify.get('/v1/company', {
        preHandler: fastify.authenticate,
        config: {
            rateLimit: {
                max: 30,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const { scope, companyId } = request.auth;
        const cfg = request.routeOptions.config;
        if (cfg.rateLimit) {
            cfg.rateLimit.max = scope === 'COMPANY' ? 30 : 5;
        }
        if (scope !== 'COMPANY') {
            return reply.code(403).send({
                error: 'Workspace API keys cannot read company info'
            });
        }
        const company = await prisma_1.prisma.company.findUnique({
            where: { id: companyId }
        });
        if (!company) {
            return reply.code(404).send({ error: 'Company not found' });
        }
        return reply.send({
            data: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                eventsPerMonth: company.eventsPerMonth,
                exportsPerMonth: company.exportsPerMonth,
                retentionDays: company.retentionDays,
                unlimitedRetention: company.unlimitedRetention
            }
        });
    });
    fastify.get('/v1/company/stats', {
        preHandler: fastify.authenticate,
        config: {
            rateLimit: {
                max: 20,
                timeWindow: '1 minute'
            }
        }
    }, async (request, reply) => {
        const { scope, companyId } = request.auth;
        const cfg = request.routeOptions.config;
        if (cfg.rateLimit) {
            cfg.rateLimit.max = scope === 'COMPANY' ? 20 : 5;
        }
        if (scope !== 'COMPANY') {
            return reply.code(403).send({
                error: 'Workspace API keys cannot read company stats'
            });
        }
        const workspaceCount = await prisma_1.prisma.workspace.count({
            where: { companyId }
        });
        const eventCount = await prisma_1.prisma.event.count({
            where: {
                workspace: { companyId }
            }
        });
        return reply.send({
            data: {
                workspaceCount,
                totalEvents: eventCount
            }
        });
    });
}
