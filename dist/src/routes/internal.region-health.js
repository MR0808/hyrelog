import { env } from "@/config/env";
import { checkAllRegionsHealth } from "@/lib/failover";
import { getAllRegions } from "@/lib/regionClient";
import { prisma } from "@/lib/prisma";
/**
 * Internal endpoint for region health monitoring.
 * Requires INTERNAL_TOKEN header.
 */
export const internalRegionHealthRoutes = async (app) => {
    app.get("/internal/region-health", async (request, reply) => {
        // Check internal token
        const token = request.headers["x-internal-token"];
        if (!token || token !== env.INTERNAL_TOKEN) {
            throw reply.forbidden("Invalid or missing internal token");
        }
        const regions = await getAllRegions();
        const health = await checkAllRegionsHealth();
        // Get pending writes count per region
        const pendingWrites = await prisma.pendingWrite.groupBy({
            by: ["region"],
            _count: {
                id: true,
            },
        });
        const pendingWritesMap = new Map(pendingWrites.map((pw) => [pw.region, pw._count.id]));
        // Get replication backlog (companies with replicateTo configured)
        const replicationBacklog = await prisma.company.count({
            where: {
                replicateTo: {
                    isEmpty: false,
                },
            },
        });
        return {
            regions: regions.map((region) => ({
                region,
                healthy: health[region]?.healthy ?? false,
                latencyMs: health[region]?.latencyMs,
                pendingWrites: pendingWritesMap.get(region) ?? 0,
            })),
            replicationBacklog,
            timestamp: new Date().toISOString(),
        };
    });
};
//# sourceMappingURL=internal.region-health.js.map