import { Region } from "@prisma/client";
import { getAllRegions } from "@/lib/regionClient";

/**
 * Runs a cron job callback for each configured region.
 */
export async function runCronPerRegion<T = void>(
  callback: (region: Region) => Promise<T>,
): Promise<T[]> {
  const regions = await getAllRegions();
  const results: T[] = [];

  for (const region of regions) {
    try {
      const result = await callback(region);
      results.push(result);
    } catch (error) {
      console.error(`Cron failed for region ${region}:`, error);
      // Continue with other regions
    }
  }

  return results;
}

/**
 * Runs a cron job callback for a specific region.
 */
export async function runCronForRegion<T = void>(
  region: Region,
  callback: (region: Region) => Promise<T>,
): Promise<T> {
  return callback(region);
}

