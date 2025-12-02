export type ArchivalConfig = {
    companyId: string;
    effectiveRetentionDays: number;
    removePayloadFromDb?: boolean;
};
/**
 * Groups events by date for archival.
 */
export declare const groupEventsByDate: (events: Array<{
    createdAt: Date;
}>) => Map<string, {
    createdAt: Date;
}[]>;
/**
 * Archives events older than retention window to S3.
 */
export declare const archiveEvents: (config: ArchivalConfig) => Promise<number>;
/**
 * Checks if company has S3 archival add-on.
 */
export declare const hasS3ArchivalAddOn: (companyId: string) => Promise<boolean>;
//# sourceMappingURL=archival.d.ts.map