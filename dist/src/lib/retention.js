const DAY_IN_MS = 86_400_000;
/**
 * Returns the earliest timestamp events can be returned for.
 */
export const getRetentionWindowStart = (ctx, now = new Date()) => {
    const retentionDays = ctx.workspace?.retentionDays ?? ctx.company.retentionDays;
    const start = new Date(now.getTime() - retentionDays * DAY_IN_MS);
    return {
        start,
        retentionApplied: true,
    };
};
//# sourceMappingURL=retention.js.map