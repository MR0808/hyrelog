import { runCronPerRegion } from "@/lib/regionCron";
import { processPendingWrites, checkRegionHealth } from "@/lib/failover";
import type { Region } from "@prisma/client";

/**
 * Processes pending writes for recovered regions.
 * Runs every 5 minutes.
 */
export const runFailoverRecovery = async (): Promise<void> => {
  console.log("🔄 Starting failover recovery job...\n");

  await runCronPerRegion(async (region: Region) => {
    console.log(`Checking region: ${region}`);

    // Check if region is healthy
    const healthy = await checkRegionHealth(region);
    if (!healthy) {
      console.log(`  ⚠️  Region ${region} is unhealthy - skipping recovery`);
      return;
    }

    // Process pending writes
    const processed = await processPendingWrites(region);

    if (processed > 0) {
      console.log(`  ✅ Processed ${processed} pending writes for region ${region}`);
    } else {
      console.log(`  ✅ No pending writes for region ${region}`);
    }
  });

  console.log("\n✅ Failover recovery job completed");
};

