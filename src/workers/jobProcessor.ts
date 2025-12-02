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

import { JobType } from "@prisma/client";

import { processJobQueue } from "@/lib/jobs";

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

const run = async () => {
  console.log("Job processor started. Polling for pending jobs...");

  const poll = async () => {
    try {
      await processJobQueue();
    } catch (error) {
      console.error("Error processing job queue:", error);
    }

    setTimeout(poll, POLL_INTERVAL_MS);
  };

  poll();
};

// Always run when executed directly
run().catch((error) => {
  console.error("Fatal error in job processor:", error);
  process.exit(1);
});

export { run as startJobProcessor };

