import { prisma } from "@/lib/prisma";
import { WebhookDeliveryStatus } from "@prisma/client";
/**
 * Aggregates metrics for /internal/metrics endpoint.
 * Runs every 1 minute to refresh cached values.
 */
export const runMetricsAggregator = async () => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last5min = new Date(now.getTime() - 5 * 60 * 1000);
    const [pendingWebhooks, failedWebhooks, eventsIngested24h, apiKeyUsage5min] = await Promise.all([
        prisma.webhookDelivery.count({
            where: {
                status: WebhookDeliveryStatus.PENDING,
            },
        }),
        prisma.webhookDelivery.count({
            where: {
                status: WebhookDeliveryStatus.FAILED,
                nextAttemptAt: {
                    lte: now,
                },
            },
        }),
        prisma.auditEvent.count({
            where: {
                createdAt: {
                    gte: last24h,
                },
            },
        }),
        prisma.apiKeyLog.count({
            where: {
                createdAt: {
                    gte: last5min,
                },
            },
        }),
    ]);
    return {
        pendingWebhooks,
        failedWebhooks,
        eventsIngested24h,
        apiKeyUsage5min,
    };
};
//# sourceMappingURL=metricsAggregator.js.map