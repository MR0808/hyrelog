/**
 * Aggregates metrics for /internal/metrics endpoint.
 * Runs every 1 minute to refresh cached values.
 */
export declare const runMetricsAggregator: () => Promise<{
    pendingWebhooks: number;
    failedWebhooks: number;
    eventsIngested24h: number;
    apiKeyUsage5min: number;
}>;
//# sourceMappingURL=metricsAggregator.d.ts.map