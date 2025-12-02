import { ApiKeyType } from "@prisma/client";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";
import { getExportLimit, buildExportQuery, streamEventsForExport } from "@/lib/exports";
const exportQuerySchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    action: z.string().optional(),
    category: z.string().optional(),
});
export const keyCompanyExportsRoutes = async (app) => {
    app.get("/v1/key/company/export.json", async (request, reply) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const limit = await getExportLimit(ctx.company.id);
        const queryParams = exportQuerySchema.parse(request.query);
        const filters = {};
        if (queryParams.from) {
            filters.from = new Date(queryParams.from);
        }
        if (queryParams.to) {
            filters.to = new Date(queryParams.to);
        }
        if (queryParams.action) {
            filters.action = queryParams.action;
        }
        if (queryParams.category) {
            filters.category = queryParams.category;
        }
        const where = buildExportQuery({
            company: ctx.company,
            filters,
        });
        // Count total (capped at limit)
        const total = await prisma.auditEvent.count({ where });
        const exportCount = Math.min(total, limit);
        reply.header("Content-Type", "application/json");
        reply.header("Content-Disposition", `attachment; filename="hyrelog-export-${Date.now()}.json"`);
        reply.raw.write("[\n");
        let first = true;
        let exported = 0;
        for await (const batch of streamEventsForExport({ where, limit: exportCount })) {
            for (const event of batch) {
                if (!first) {
                    reply.raw.write(",\n");
                }
                first = false;
                reply.raw.write(JSON.stringify(event));
                exported++;
            }
        }
        reply.raw.write("\n]");
        reply.raw.end();
    });
    app.get("/v1/key/company/export.csv", async (request, reply) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const limit = await getExportLimit(ctx.company.id);
        const queryParams = exportQuerySchema.parse(request.query);
        const filters = {};
        if (queryParams.from) {
            filters.from = new Date(queryParams.from);
        }
        if (queryParams.to) {
            filters.to = new Date(queryParams.to);
        }
        if (queryParams.action) {
            filters.action = queryParams.action;
        }
        if (queryParams.category) {
            filters.category = queryParams.category;
        }
        const where = buildExportQuery({
            company: ctx.company,
            filters,
        });
        const exportCount = Math.min(await prisma.auditEvent.count({ where }), limit);
        reply.header("Content-Type", "text/csv");
        reply.header("Content-Disposition", `attachment; filename="hyrelog-export-${Date.now()}.csv"`);
        // CSV header
        reply.raw.write("id,companyId,workspaceId,projectId,action,category,actorId,actorEmail,actorName,targetId,targetType,createdAt,hash\n");
        for await (const batch of streamEventsForExport({ where, limit: exportCount })) {
            for (const event of batch) {
                const row = [
                    event.id,
                    event.companyId,
                    event.workspaceId,
                    event.projectId ?? "",
                    event.action,
                    event.category,
                    event.actorId ?? "",
                    event.actorEmail ?? "",
                    event.actorName ?? "",
                    event.targetId ?? "",
                    event.targetType ?? "",
                    event.createdAt.toISOString(),
                    event.hash,
                ]
                    .map((val) => `"${String(val).replace(/"/g, '""')}"`)
                    .join(",");
                reply.raw.write(`${row}\n`);
            }
        }
        reply.raw.end();
    });
};
//# sourceMappingURL=key.company.exports.js.map