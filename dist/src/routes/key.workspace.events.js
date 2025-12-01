import { ApiKeyType, Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { incrementEventUsage, recordQueryUsage } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { buildPaginatedResponse, resolvePagination } from "@/lib/pagination";
import { getRetentionWindowStart } from "@/lib/retention";
import { computeEventHash } from "@/lib/hashchain";
import { eventFilterSchema, ingestEventSchema } from "@/schemas/events";
import { BillingLimitError } from "@/types/billing";
export const keyWorkspaceEventsRoutes = async (app) => {
    app.get("/v1/key/workspace/events", async (request) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.WORKSPACE] });
        if (!ctx.workspace) {
            throw request.server.httpErrors.badRequest("Workspace key not linked to a workspace");
        }
        const filters = eventFilterSchema.parse(request.query);
        const pagination = resolvePagination(request.query);
        const retention = getRetentionWindowStart({
            company: ctx.company,
            workspace: ctx.workspace,
        });
        const createdAtFilter = {
            gte: filters.from ? new Date(Math.max(filters.from.getTime(), retention.start.getTime())) : retention.start,
        };
        if (filters.to) {
            createdAtFilter.lte = filters.to;
        }
        const where = {
            workspaceId: ctx.workspace.id,
            createdAt: createdAtFilter,
            ...(filters.projectId ? { projectId: { equals: filters.projectId } } : {}),
            ...(filters.action ? { action: { equals: filters.action } } : {}),
            ...(filters.category ? { category: { equals: filters.category } } : {}),
            ...(filters.actorId ? { actorId: { equals: filters.actorId } } : {}),
            ...(filters.actorEmail ? { actorEmail: { equals: filters.actorEmail } } : {}),
        };
        const [events, total] = await Promise.all([
            prisma.auditEvent.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: pagination.offset,
                take: pagination.limit,
            }),
            prisma.auditEvent.count({ where }),
        ]);
        await recordQueryUsage({
            companyId: ctx.company.id,
            workspaceId: ctx.workspace.id,
            amount: events.length,
        });
        return buildPaginatedResponse(events, {
            page: pagination.page,
            limit: pagination.limit,
            total,
            retentionApplied: true,
            retentionWindowStart: retention.start,
        });
    });
    app.post("/v1/key/workspace/events", async (request, reply) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.WORKSPACE] });
        if (!ctx.workspace) {
            throw request.server.httpErrors.badRequest("Workspace key not linked to a workspace");
        }
        const payload = ingestEventSchema.parse(request.body);
        if (payload.projectId) {
            const projectExists = await prisma.project.findFirst({
                where: {
                    id: payload.projectId,
                    workspaceId: ctx.workspace.id,
                },
                select: { id: true },
            });
            if (!projectExists) {
                throw request.server.httpErrors.badRequest("Project does not belong to this workspace");
            }
        }
        try {
            await incrementEventUsage({
                companyId: ctx.company.id,
                workspaceId: ctx.workspace.id,
                amount: 1,
            });
        }
        catch (error) {
            if (error instanceof BillingLimitError) {
                const statusCode = Number(env.BILLING_HARD_CAP_RESPONSE);
                reply.code(statusCode);
                return {
                    error: "billing_limit",
                    message: error.message,
                    checkpoint: error.checkpoint,
                };
            }
            throw error;
        }
        const latestEvent = await prisma.auditEvent.findFirst({
            where: { workspaceId: ctx.workspace.id },
            orderBy: { createdAt: "desc" },
        });
        const createdAt = new Date();
        const prevHash = latestEvent?.hash ?? null;
        const hash = computeEventHash({
            workspaceId: ctx.workspace.id,
            companyId: ctx.company.id,
            projectId: payload.projectId,
            action: payload.action,
            category: payload.category,
            payload: payload.payload,
            metadata: payload.metadata,
            actorId: payload.actor?.id,
            actorEmail: payload.actor?.email,
            actorName: payload.actor?.name,
            createdAt,
        }, prevHash);
        const event = await prisma.auditEvent.create({
            data: {
                companyId: ctx.company.id,
                workspaceId: ctx.workspace.id,
                projectId: payload.projectId,
                action: payload.action,
                category: payload.category,
                actorId: payload.actor?.id,
                actorEmail: payload.actor?.email,
                actorName: payload.actor?.name,
                targetId: payload.target?.id,
                targetType: payload.target?.type,
                payload: payload.payload,
                metadata: payload.metadata,
                hash,
                prevHash,
                createdAt,
            },
        });
        await prisma.apiKey.update({
            where: { id: ctx.apiKey.id },
            data: { lastUsedAt: createdAt },
        });
        reply.code(201);
        return event;
    });
};
//# sourceMappingURL=key.workspace.events.js.map