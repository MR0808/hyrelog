import { Region } from "@prisma/client";
import { getAllRegions } from "@/lib/regionClient";
/**
 * Runs a cron job callback for each configured region.
 */
export async function runCronPerRegion(callback) {
    const regions = await getAllRegions();
    const results = [];
    for (const region of regions) {
        try {
            const result = await callback(region);
            results.push(result);
        }
        catch (error) {
            console.error(`Cron failed for region ${region}:`, error);
            // Continue with other regions
        }
    }
    return results;
}
/**
 * Runs a cron job callback for a specific region.
 */
export async function runCronForRegion(region, callback) {
    return callback(region);
}
//# sourceMappingURL=regionCron.js.map