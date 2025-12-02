import { checkAllRegionsHealth } from "@/lib/failover";
import { prisma } from "@/lib/prisma";
/**
 * Checks health of all regions and logs status.
 * Runs every minute.
 */
export const runRegionHealthCheck = async () => {
    const health = await checkAllRegionsHealth();
    for (const [region, status] of Object.entries(health)) {
        if (status.healthy) {
            console.log(`✅ Region ${region}: Healthy (${status.latencyMs}ms)`);
        }
        else {
            console.error(`❌ Region ${region}: Unhealthy`);
            // In production, you'd trigger alerts here
        }
    }
};
//# sourceMappingURL=regionHealthCheck.js.map