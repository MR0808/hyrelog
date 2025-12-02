/**
 * Background job processor for HyreLog.
 *
 * This module processes async jobs like GDPR exports.
 * In production, this would run as a separate worker service.
 *
 * Usage:
 *   - Run as a separate process: `tsx src/workers/jobProcessor.ts`
 *   - Or integrate into the main server with a cron/scheduler
 */
declare const run: () => Promise<void>;
export { run as startJobProcessor };
//# sourceMappingURL=jobProcessor.d.ts.map