import cron from "node-cron";
import { runBillingRollover } from "@/crons/billingRollover";
import { runUsageReconciliation } from "@/crons/usageReconciliation";
import { runThresholdChecker } from "@/crons/thresholdChecker";
import { runRetentionMarking } from "@/crons/retentionMarking";
import { runArchivalJob } from "@/crons/archivalJob";
import { runArchiveVerification } from "@/crons/archiveVerification";
import { runTemplateEnforcer } from "@/crons/templateEnforcer";
import { runAlertTrigger } from "@/crons/alertTrigger";
import { runMetricsAggregator } from "@/crons/metricsAggregator";
import { runTailCleaner } from "@/crons/tailCleaner";
import { runColdArchiveJob } from "@/crons/coldArchiveJob";
import { runFailoverRecovery } from "@/crons/failoverRecovery";
import { runRegionHealthCheck } from "@/crons/regionHealthCheck";
import { processGdprRequests } from "@/workers/gdprWorker";
import { processReplicationJobs } from "@/workers/replicationWorker";
/**
 * Initializes and starts all cron jobs.
 */
export const startCronJobs = () => {
    // Billing rollover: Daily at 2 AM (fallback if Stripe webhook missed)
    cron.schedule("0 2 * * *", async () => {
        console.log("Running billing rollover job");
        try {
            await runBillingRollover();
        }
        catch (error) {
            console.error("Billing rollover failed:", error);
        }
    });
    // Usage reconciliation: Every hour
    cron.schedule("0 * * * *", async () => {
        console.log("Running usage reconciliation job");
        try {
            await runUsageReconciliation();
        }
        catch (error) {
            console.error("Usage reconciliation failed:", error);
        }
    });
    // Threshold checker: Every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        console.log("Running threshold checker job");
        try {
            await runThresholdChecker();
        }
        catch (error) {
            console.error("Threshold checker failed:", error);
        }
    });
    // Retention marking: Daily at 3 AM
    cron.schedule("0 3 * * *", async () => {
        console.log("Running retention marking job");
        try {
            await runRetentionMarking();
        }
        catch (error) {
            console.error("Retention marking failed:", error);
        }
    });
    // Archival job: Daily at 4 AM
    cron.schedule("0 4 * * *", async () => {
        console.log("Running archival job");
        try {
            await runArchivalJob();
        }
        catch (error) {
            console.error("Archival job failed:", error);
        }
    });
    // Archive verification: Weekly on Sunday at 5 AM
    cron.schedule("0 5 * * 0", async () => {
        console.log("Running archive verification job");
        try {
            await runArchiveVerification();
        }
        catch (error) {
            console.error("Archive verification failed:", error);
        }
    });
    // Template enforcer: Daily at 6 AM
    cron.schedule("0 6 * * *", async () => {
        console.log("Running template enforcer job");
        try {
            await runTemplateEnforcer();
        }
        catch (error) {
            console.error("Template enforcer failed:", error);
        }
    });
    // Alert trigger: Every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        console.log("Running alert trigger job");
        try {
            await runAlertTrigger();
        }
        catch (error) {
            console.error("Alert trigger failed:", error);
        }
    });
    // Metrics aggregator: Every 1 minute
    cron.schedule("*/1 * * * *", async () => {
        try {
            await runMetricsAggregator();
        }
        catch (error) {
            console.error("Metrics aggregator failed:", error);
        }
    });
    // Tail cleaner: Every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        console.log("Running tail cleaner job");
        try {
            await runTailCleaner();
        }
        catch (error) {
            console.error("Tail cleaner failed:", error);
        }
    });
    // Phase 3: Cold archive job: Weekly on Sunday at 3 AM
    cron.schedule("0 3 * * 0", async () => {
        console.log("Running cold archive job");
        try {
            await runColdArchiveJob();
        }
        catch (error) {
            console.error("Cold archive job failed:", error);
        }
    });
    // Phase 3: Failover recovery: Every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        console.log("Running failover recovery job");
        try {
            await runFailoverRecovery();
        }
        catch (error) {
            console.error("Failover recovery failed:", error);
        }
    });
    // Phase 3: Region health check: Every 1 minute
    cron.schedule("*/1 * * * *", async () => {
        try {
            await runRegionHealthCheck();
        }
        catch (error) {
            console.error("Region health check failed:", error);
        }
    });
    // Phase 3: GDPR worker: Every 10 minutes
    cron.schedule("*/10 * * * *", async () => {
        console.log("Running GDPR worker");
        try {
            await processGdprRequests();
        }
        catch (error) {
            console.error("GDPR worker failed:", error);
        }
    });
    // Phase 3: Replication worker: Every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        console.log("Running replication worker");
        try {
            await processReplicationJobs();
        }
        catch (error) {
            console.error("Replication worker failed:", error);
        }
    });
    console.log("All cron jobs started");
};
//# sourceMappingURL=cronScheduler.js.map