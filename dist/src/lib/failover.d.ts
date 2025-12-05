import { Region } from '@prisma/client';
/**
 * Checks if a region is healthy.
 */
export declare function checkRegionHealth(region: Region): Promise<boolean>;
/**
 * Manually triggers failover for a region.
 * Queues all writes to PendingWrite table.
 */
export declare function triggerFailover(region: Region): Promise<void>;
/**
 * Processes pending writes for a region after recovery.
 */
export declare function processPendingWrites(region: Region): Promise<number>;
/**
 * Queues a write to the pending writes table.
 * Used when a region is unavailable.
 */
export declare function queuePendingWrite(companyId: string, region: Region, eventData: any): Promise<void>;
/**
 * Checks all regions and returns health status.
 */
export declare function checkAllRegionsHealth(): Promise<Record<Region, {
    healthy: boolean;
    latencyMs?: number;
}>>;
//# sourceMappingURL=failover.d.ts.map