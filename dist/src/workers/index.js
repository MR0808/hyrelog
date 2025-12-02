/**
 * Combined worker that runs all background workers.
 *
 * This runs:
 * - Webhook delivery worker (every 1 minute)
 * - Job processor (GDPR exports, every 5 seconds)
 *
 * Usage:
 *   npm run worker
 *   # or
 *   tsx src/workers/index.ts
 */
import { processWebhookDeliveries } from "./webhookWorker";
import { processJobQueue } from "@/lib/jobs";
const WEBHOOK_INTERVAL_MS = 60 * 1000; // 1 minute
const JOB_INTERVAL_MS = 5 * 1000; // 5 seconds
const run = async () => {
    console.log("🚀 HyreLog Workers Started");
    console.log("   - Webhook delivery worker: every 1 minute");
    console.log("   - Job processor: every 5 seconds");
    console.log("   Press Ctrl+C to stop\n");
    // Webhook worker loop
    const webhookLoop = async () => {
        while (true) {
            try {
                const processed = await processWebhookDeliveries();
                if (processed > 0) {
                    console.log(`[Webhook] Processed ${processed} deliveries`);
                }
            }
            catch (error) {
                console.error("[Webhook] Error:", error);
            }
            await new Promise((resolve) => setTimeout(resolve, WEBHOOK_INTERVAL_MS));
        }
    };
    // Job processor loop
    const jobLoop = async () => {
        while (true) {
            try {
                await processJobQueue();
            }
            catch (error) {
                console.error("[Job] Error:", error);
            }
            await new Promise((resolve) => setTimeout(resolve, JOB_INTERVAL_MS));
        }
    };
    // Run both loops concurrently
    void webhookLoop();
    void jobLoop();
    // Handle graceful shutdown
    process.on("SIGINT", () => {
        console.log("\n🛑 Shutting down workers...");
        process.exit(0);
    });
    process.on("SIGTERM", () => {
        console.log("\n🛑 Shutting down workers...");
        process.exit(0);
    });
};
run().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map