import { ApiKeyType, Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { incrementEventUsage, recordQueryUsage } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { buildPaginatedResponse, resolvePagination } from "@/lib/pagination";
import { getRetentionWindowStart } from "@/lib/retention";
import { computeEventHash } from "@/lib/hashchain";
import { createWebhookDeliveries } from "@/lib/webhooks";
import { getTraceId } from "@/lib/otel";
import { getWorkspaceTemplate, validateEventWithTemplate } from "@/lib/templates";
import { eventFilterSchema, ingestEventSchema } from "@/schemas/events";
import { BillingLimitError } from "@/types/billing";
import { ingestEventToRegion, queryWorkspaceEvents } from "@/lib/regionBroker";
import { invalidateWorkspaceCache } from "@/lib/edgeCache";
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
        // Use region broker for querying
        const { events, total } = await queryWorkspaceEvents(ctx.workspace.id, {
            page: pagination.page,
            limit: pagination.limit,
            action: filters.action,
            category: filters.category,
            actorId: filters.actorId,
            actorEmail: filters.actorEmail,
            projectId: filters.projectId,
            from: createdAtFilter.gte,
            to: createdAtFilter.lte,
        });
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
        // Validate against workspace template if assigned
        const template = await getWorkspaceTemplate(ctx.workspace.id);
        if (template) {
            const input = {
                action: payload.action,
                category: payload.category,
            };
            if (payload.actor) {
                input.actor = {
                    ...(payload.actor.id ? { id: payload.actor.id } : {}),
                    ...(payload.actor.email ? { email: payload.actor.email } : {}),
                    ...(payload.actor.name ? { name: payload.actor.name } : {}),
                };
            }
            if (payload.metadata) {
                input.metadata = payload.metadata;
            }
            if (payload.projectId) {
                input.projectId = payload.projectId;
            }
            const validation = validateEventWithTemplate(input, template);
            if (!validation.valid) {
                throw request.server.httpErrors.badRequest(`Template validation failed: ${validation.errors.join(", ")}`);
            }
        }
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
        // Get latest event for hash chain (from regional DB)
        const { getPrismaForCompany } = await import("@/lib/regionClient");
        const regionalPrisma = await getPrismaForCompany(ctx.company.id);
        const latestEvent = await regionalPrisma.auditEvent.findFirst({
            where: { workspaceId: ctx.workspace.id },
            orderBy: { createdAt: "desc" },
        });
        const createdAt = new Date();
        const prevHash = latestEvent?.hash ?? null;
        const hash = computeEventHash({
            workspaceId: ctx.workspace.id,
            companyId: ctx.company.id,
            projectId: payload.projectId ?? null,
            action: payload.action,
            category: payload.category,
            payload: payload.payload,
            metadata: payload.metadata,
            actorId: payload.actor?.id ?? null,
            actorEmail: payload.actor?.email ?? null,
            actorName: payload.actor?.name ?? null,
            createdAt,
        }, prevHash);
        const traceId = getTraceId() ?? null;
        // Use region broker for ingestion
        const event = await ingestEventToRegion(ctx.company.id, ctx.workspace.id, {
            ...payload,
            hash,
            prevHash,
            traceId,
            createdAt,
        });
        // Invalidate cache
        await invalidateWorkspaceCache(ctx.workspace.id);
        await prisma.apiKey.update({
            where: { id: ctx.apiKey.id },
            data: { lastUsedAt: createdAt },
        });
        // Create webhook deliveries (non-blocking)
        void createWebhookDeliveries({
            companyId: ctx.company.id,
            workspaceId: ctx.workspace.id,
            eventId: event.id,
        }).catch((error) => {
            // Log but don't fail the request
            request.log.error({ error }, "Failed to create webhook deliveries");
        });
        reply.code(201);
        return event;
    });
};
//# sourceMappingURL=key.workspace.events.js.map