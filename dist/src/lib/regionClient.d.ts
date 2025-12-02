import { PrismaClient, Region } from "@prisma/client";
/**
 * Gets the Prisma client for a specific region.
 * Creates the client if it doesn't exist.
 */
export declare function getPrismaForRegion(region: Region): Promise<PrismaClient>;
/**
 * Gets the region for a company.
 * Defaults to AU if not set.
 */
export declare function getRegionForCompany(companyId: string): Promise<Region>;
/**
 * Gets the Prisma client for a company's region.
 */
export declare function getPrismaForCompany(companyId: string): Promise<PrismaClient>;
/**
 * Gets cold storage client configuration for a region.
 */
export declare function getColdStorageClientForRegion(region: Region): Promise<{
    provider: string;
    bucket: string;
}>;
/**
 * Gets all configured regions.
 */
export declare function getAllRegions(): Promise<Region[]>;
/**
 * Invalidates the region data store cache.
 * Call this after updating RegionDataStore records.
 */
export declare function invalidateRegionCache(): void;
/**
 * Closes all region Prisma clients.
 * Call this during graceful shutdown.
 */
export declare function closeAllRegionClients(): Promise<void>;
//# sourceMappingURL=regionClient.d.ts.map