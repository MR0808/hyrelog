import { Region } from "@prisma/client";
/**
 * Runs a cron job callback for each configured region.
 */
export declare function runCronPerRegion<T = void>(callback: (region: Region) => Promise<T>): Promise<T[]>;
/**
 * Runs a cron job callback for a specific region.
 */
export declare function runCronForRegion<T = void>(region: Region, callback: (region: Region) => Promise<T>): Promise<T>;
//# sourceMappingURL=regionCron.d.ts.map