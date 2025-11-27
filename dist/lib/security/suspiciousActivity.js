"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSuspiciousActivityForCompany = detectSuspiciousActivityForCompany;
// src/lib/security/suspiciousActivity.ts
const prisma_1 = require("../prisma"); // adjust path if your prisma helper lives elsewhere
async function detectSuspiciousActivityForCompany(companyId, options = {}) {
    const { windowMs = 24 * 60 * 60 * 1000, minRequests = 20, highErrorRateThreshold = 0.5, highVolumeThreshold = 1000, manyIpsThreshold = 10, slowDurationMs = 2000, slowRateThreshold = 0.3 } = options;
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - windowMs);
    const logs = await prisma_1.prisma.apiKeyLog.findMany({
        where: {
            companyId,
            createdAt: {
                gte: windowStart,
                lte: windowEnd
            }
        }
    });
    const byKey = new Map();
    for (const log of logs) {
        const key = log.apiKeyId;
        if (!byKey.has(key)) {
            byKey.set(key, {
                workspaceId: log.workspaceId ?? null,
                records: []
            });
        }
        byKey.get(key).records.push(log);
    }
    const alerts = [];
    for (const [apiKeyId, entry] of byKey.entries()) {
        const records = entry.records;
        const total = records.length;
        if (total < minRequests)
            continue; // not enough data
        const workspaceId = entry.workspaceId;
        const companyIdLocal = companyId;
        const errors = records.filter((r) => r.statusCode >= 400 && r.statusCode < 600);
        const slow = records.filter((r) => (r.durationMs ?? 0) >= slowDurationMs);
        const ips = new Set(records.map((r) => r.ip).filter(Boolean));
        const avgDuration = records.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / total;
        const errorRate = errors.length / total;
        const slowRate = slow.length / total;
        const distinctIps = ips.size;
        // HIGH ERROR RATE
        if (errorRate >= highErrorRateThreshold) {
            alerts.push({
                type: 'HIGH_ERROR_RATE',
                severity: errorRate > 0.8 ? 'HIGH' : 'MEDIUM',
                apiKeyId,
                workspaceId,
                companyId: companyIdLocal,
                windowStart,
                windowEnd,
                message: `API key ${apiKeyId} has error rate ${(errorRate * 100).toFixed(1)}% over last ${Math.round(windowMs / 3600000)}h`,
                metrics: {
                    totalRequests: total,
                    errorRate,
                    avgDurationMs: avgDuration
                }
            });
        }
        // HIGH VOLUME
        if (total >= highVolumeThreshold) {
            alerts.push({
                type: 'HIGH_VOLUME',
                severity: total >= highVolumeThreshold * 10 ? 'HIGH' : 'MEDIUM',
                apiKeyId,
                workspaceId,
                companyId: companyIdLocal,
                windowStart,
                windowEnd,
                message: `API key ${apiKeyId} made ${total} requests in the last ${Math.round(windowMs / 3600000)}h`,
                metrics: {
                    totalRequests: total,
                    avgDurationMs: avgDuration
                }
            });
        }
        // MANY IPS
        if (distinctIps >= manyIpsThreshold) {
            alerts.push({
                type: 'MANY_IPS',
                severity: distinctIps >= manyIpsThreshold * 2 ? 'HIGH' : 'MEDIUM',
                apiKeyId,
                workspaceId,
                companyId: companyIdLocal,
                windowStart,
                windowEnd,
                message: `API key ${apiKeyId} used from ${distinctIps} distinct IPs in the last ${Math.round(windowMs / 3600000)}h`,
                metrics: {
                    totalRequests: total,
                    distinctIps,
                    avgDurationMs: avgDuration
                }
            });
        }
        // SLOW REQUESTS
        if (slowRate >= slowRateThreshold) {
            alerts.push({
                type: 'SLOW_REQUESTS',
                severity: slowRate > 0.6 ? 'HIGH' : 'MEDIUM',
                apiKeyId,
                workspaceId,
                companyId: companyIdLocal,
                windowStart,
                windowEnd,
                message: `API key ${apiKeyId} has ${(slowRate * 100).toFixed(1)}% requests slower than ${slowDurationMs}ms`,
                metrics: {
                    totalRequests: total,
                    slowRate,
                    avgDurationMs: avgDuration
                }
            });
        }
    }
    return alerts;
}
