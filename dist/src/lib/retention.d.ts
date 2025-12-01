import type { Company, Workspace } from "@prisma/client";
export type RetentionContext = {
    company: Pick<Company, "retentionDays">;
    workspace?: Pick<Workspace, "retentionDays"> | null;
};
/**
 * Returns the earliest timestamp events can be returned for.
 */
export declare const getRetentionWindowStart: (ctx: RetentionContext, now?: Date) => {
    start: Date;
    retentionApplied: boolean;
};
//# sourceMappingURL=retention.d.ts.map