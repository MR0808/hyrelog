import { ApiKeyType } from "@prisma/client";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";
import { checkRegionHealth } from "@/lib/failover";
import { getPrismaForRegion } from "@/lib/regionClient";
/**
 * Returns region information for a company.
 */
export const keyCompanyRegionsRoutes = async (app) => {
    app.get("/v1/key/company/regions", async (request) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const company = await prisma.company.findUnique({
            where: { id: ctx.company.id },
            select: {
                dataRegion: true,
                replicateTo: true,
            },
        });
        if (!company) {
            throw request.server.httpErrors.notFound("Company not found");
        }
        // Check health of primary region
        const primaryHealth = await checkRegionHealth(company.dataRegion);
        // Check health of replica regions
        const replicaHealth = {};
        for (const replicaRegion of company.replicateTo) {
            replicaHealth[replicaRegion] = await checkRegionHealth(replicaRegion);
        }
        // Get region data store info
        const regionStore = await prisma.regionDataStore.findUnique({
            where: { region: company.dataRegion },
            select: {
                region: true,
                coldStorageProvider: true,
                coldStorageBucket: true,
            },
        });
        return {
            primary: {
                region: company.dataRegion,
                healthy: primaryHealth,
                coldStorage: regionStore
                    ? {
                        provider: regionStore.coldStorageProvider,
                        bucket: regionStore.coldStorageBucket,
                    }
                    : null,
            },
            replicas: company.replicateTo.map((region) => ({
                region,
                healthy: replicaHealth[region] ?? false,
            })),
        };
    });
};
//# sourceMappingURL=key.company.regions.js.map