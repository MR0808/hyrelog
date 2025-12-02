import type { Region } from "@prisma/client";
/**
 * Cold storage provider types.
 */
export type ColdStorageProvider = "aws" | "azure" | "gcp";
/**
 * Archives data to cold storage based on region configuration.
 * Returns the archive key/ID.
 */
export declare function archiveToColdStorage(region: Region, key: string, data: Buffer): Promise<string>;
/**
 * Retrieves data from cold storage.
 * Note: Cold storage retrieval can take hours/days for Deep Archive.
 */
export declare function retrieveFromColdStorage(region: Region, archiveKey: string): Promise<Buffer>;
/**
 * Checks if cold storage is configured for a region.
 */
export declare function isColdStorageConfigured(region: Region): Promise<boolean>;
//# sourceMappingURL=coldStorage.d.ts.map