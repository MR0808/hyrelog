/**
 * Closes current billing period and creates new one.
 * Should be triggered monthly (via Stripe webhook) with daily fallback.
 */
export declare const runBillingRollover: () => Promise<void>;
//# sourceMappingURL=billingRollover.d.ts.map