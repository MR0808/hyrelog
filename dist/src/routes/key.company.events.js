import { ApiKeyType, Prisma } from "@prisma/client";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";
import { buildPaginatedResponse, resolvePagination } from "@/lib/pagination";
import { getRetentionWindowStart } from "@/lib/retention";
import { recordQueryUsage } from "@/lib/billing";
import { eventFilterSchema } from "@/schemas/events";
import { queryCompanyEvents } from "@/lib/regionBroker";
export const keyCompanyEventsRoutes = async (app) => {
    app.get("/v1/key/company/events", async (request) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const filters = eventFilterSchema.parse(request.query);
        const pagination = resolvePagination(request.query);
        const retention = getRetentionWindowStart({
            company: ctx.company,
        });
        const createdAtFilter = {
            gte: filters.from ? new Date(Math.max(filters.from.getTime(), retention.start.getTime())) : retention.start,
        };
        if (filters.to) {
            createdAtFilter.lte = filters.to;
        }
        const where = {
            companyId: ctx.company.id,
            createdAt: createdAtFilter,
            ...(filters.action ? { action: { equals: filters.action } } : {}),
            ...(filters.category ? { category: { equals: filters.category } } : {}),
            ...(filters.actorId ? { actorId: { equals: filters.actorId } } : {}),
            ...(filters.actorEmail ? { actorEmail: { equals: filters.actorEmail } } : {}),
            ...(filters.workspaceId ? { workspaceId: { equals: filters.workspaceId } } : {}),
            ...(filters.projectId ? { projectId: { equals: filters.projectId } } : {}),
        };
        // Use region broker for querying
        const { events, total } = await queryCompanyEvents(ctx.company.id, {
            page: pagination.page,
            limit: pagination.limit,
            action: filters.action,
            category: filters.category,
            actorId: filters.actorId,
            actorEmail: filters.actorEmail,
            workspaceId: filters.workspaceId,
            projectId: filters.projectId,
            from: createdAtFilter.gte,
            to: createdAtFilter.lte,
        });
        await recordQueryUsage({
            companyId: ctx.company.id,
            workspaceId: filters.workspaceId ?? null,
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
};
//# sourceMappingURL=key.company.events.js.map