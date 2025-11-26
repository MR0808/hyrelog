import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';
import {
    CompanyRole,
    WorkspaceRole,
    MeterType
} from '../generated/prisma/client';

const rbacPlugin: FastifyPluginAsync = async (fastify) => {
    // -----------------------------------------------------
    // Load Company Context
    // -----------------------------------------------------
    async function loadCompanyContext(request: FastifyRequest) {
        if (!request.user) return null;

        const cu = await prisma.companyUser.findFirst({
            where: { userId: request.user.id },
            include: { company: true }
        });

        if (!cu) return null;

        request.companyContext = {
            companyId: cu.companyId,
            role: cu.role
        };

        return request.companyContext;
    }

    // -----------------------------------------------------
    // Load Workspace Context
    // -----------------------------------------------------
    async function loadWorkspaceContext(
        request: FastifyRequest,
        workspaceId: string
    ) {
        if (!request.user || !request.companyContext) return null;

        const wu = await prisma.workspaceUser.findFirst({
            where: {
                userId: request.user.id,
                workspaceId
            }
        });

        if (!wu) return null;

        request.workspaceContext = {
            workspaceId,
            role: wu.role
        };

        return request.workspaceContext;
    }

    // -----------------------------------------------------
    // Company role enforcement
    // -----------------------------------------------------
    fastify.decorate(
        'requireCompanyRole',
        (roles: CompanyRole[]) =>
            async function (request: FastifyRequest, reply: FastifyReply) {
                if (!request.user) {
                    reply.code(401).send({ error: 'Unauthenticated' });
                    return;
                }

                let ctx = request.companyContext;
                if (!ctx) ctx = await loadCompanyContext(request);
                if (!ctx || !roles.includes(ctx.role)) {
                    reply
                        .code(403)
                        .send({ error: 'Insufficient company permissions' });
                    return;
                }
            }
    );

    // -----------------------------------------------------
    // Workspace role enforcement
    // -----------------------------------------------------
    fastify.decorate(
        'requireWorkspaceRole',
        (roles: WorkspaceRole[]) =>
            async function (request: FastifyRequest, reply: FastifyReply) {
                if (!request.user) {
                    reply.code(401).send({ error: 'Unauthenticated' });
                    return;
                }

                const workspaceId =
                    (request.params as any).workspaceId ||
                    (request.body as any)?.workspaceId ||
                    (request.query as any)?.workspaceId;

                if (!workspaceId) {
                    reply.code(400).send({ error: 'workspaceId is required' });
                    return;
                }

                if (!request.companyContext) {
                    await loadCompanyContext(request);
                }

                const wctx = await loadWorkspaceContext(request, workspaceId);
                if (!wctx || !roles.includes(wctx.role)) {
                    reply
                        .code(403)
                        .send({ error: 'Insufficient workspace permissions' });
                    return;
                }
            }
    );

    // -----------------------------------------------------
    // Usage limit enforcement
    // -----------------------------------------------------
    fastify.decorate(
        'enforceMeter',
        (meter: MeterType) =>
            async function (request: FastifyRequest, reply: FastifyReply) {
                if (!request.companyContext) {
                    await loadCompanyContext(request);
                }

                const ctx = request.companyContext;
                if (!ctx) {
                    reply.code(403).send({ error: 'No company context' });
                    return;
                }

                const now = new Date();

                const bm = await prisma.billingMeter.findFirst({
                    where: {
                        companyId: ctx.companyId,
                        meterType: meter,
                        periodStart: { lte: now },
                        periodEnd: { gte: now }
                    }
                });

                if (!bm) return;

                if (bm.hardCap && bm.currentValue >= bm.softThreshold!) {
                    reply.code(429).send({ error: 'Usage limit reached' });
                    return;
                }
            }
    );
};

export default fp(rbacPlugin, {
    name: 'rbac-plugin'
});
