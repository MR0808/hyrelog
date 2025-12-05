import { ApiKeyType } from '@prisma/client';
import { authenticateApiKey } from '@/lib/apiKeyAuth';
import { queryGlobalEvents } from '@/lib/regionBroker';
import { buildPaginatedResponse, resolvePagination } from '@/lib/pagination';
import { getRetentionWindowStart } from '@/lib/retention';
import { recordQueryUsage } from '@/lib/billing';
import { eventFilterSchema } from '@/schemas/events';
/**
 * Global multi-region event search endpoint.
 * Uses GlobalEventIndex for metadata lookup, then fetches full events from regional DBs.
 */
export const keyCompanyGlobalRoutes = async (app) => {
    app.get('/v1/key/company/events/global', async (request) => {
        const ctx = await authenticateApiKey(request, {
            allow: [ApiKeyType.COMPANY]
        });
        const filters = eventFilterSchema.parse(request.query);
        const pagination = resolvePagination(request.query);
        const retention = getRetentionWindowStart({
            company: ctx.company
        });
        // Apply retention window
        const fromDate = filters.from
            ? new Date(Math.max(filters.from.getTime(), retention.start.getTime()))
            : retention.start;
        const toDate = filters.to ?? new Date();
        const { events, total } = await queryGlobalEvents(ctx.company.id, {
            page: pagination.page,
            limit: pagination.limit,
            ...(filters.action && { action: filters.action }),
            ...(filters.category && { category: filters.category }),
            ...(filters.actorId && { actorId: filters.actorId }),
            ...(filters.actorEmail && { actorEmail: filters.actorEmail }),
            ...(filters.workspaceId && { workspaceId: filters.workspaceId }),
            ...(filters.projectId && { projectId: filters.projectId }),
            from: fromDate,
            to: toDate
        });
        await recordQueryUsage({
            companyId: ctx.company.id,
            workspaceId: filters.workspaceId ?? null,
            amount: events.length
        });
        return buildPaginatedResponse(events, {
            page: pagination.page,
            limit: pagination.limit,
            total,
            retentionApplied: true,
            retentionWindowStart: retention.start
        });
    });
};
//# sourceMappingURL=key.company.global.js.map