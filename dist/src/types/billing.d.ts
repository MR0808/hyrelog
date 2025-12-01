import type { BillingMeter, UsageStats } from "@prisma/client";
export type BillingIncrementInput = {
    companyId: string;
    workspaceId?: string | null;
    amount?: number;
};
export type BillingCheckpoint = {
    meter: BillingMeter;
    usage: UsageStats;
    softLimitTriggered: boolean;
    hardLimitTriggered: boolean;
};
/**
 * Error raised when billing enforcement should reject an operation.
 */
export declare class BillingLimitError extends Error {
    readonly checkpoint: BillingCheckpoint;
    constructor(message: string, checkpoint: BillingCheckpoint);
}
//# sourceMappingURL=billing.d.ts.map