import type { BillingCheckpoint, BillingIncrementInput } from "@/types/billing";
/**
 * Increments the event ingestion meter and enforces plan limits.
 */
export declare const incrementEventUsage: (input: BillingIncrementInput) => Promise<BillingCheckpoint>;
/**
 * Tracks query usage for analytics (no enforcement).
 */
export declare const recordQueryUsage: (input: BillingIncrementInput) => Promise<void>;
//# sourceMappingURL=billing.d.ts.map