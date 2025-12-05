/**
 * Company API Key lifecycle management endpoints
 * Phase 4: API Key Lifecycle Improvements
 */
import { ApiKeyType } from "@prisma/client";
import { z } from "zod";
import crypto from "node:crypto";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/apiKeyAuth";
const rotateKeyBodySchema = z.object({
    name: z.string().optional(),
    revokeOld: z.boolean().default(false),
});
const revokeKeyBodySchema = z.object({
    reason: z.string().optional(),
});
const createKeyBodySchema = z.object({
    name: z.string().min(1),
    readOnly: z.boolean().default(false),
    labels: z.array(z.string()).default([]),
    ipAllowlist: z.array(z.string()).default([]),
    expiresAt: z.string().datetime().optional(),
});
export const keyCompanyLifecycleRoutes = async (app) => {
    /**
     * Create a new company API key
     * POST /v1/key/company/create
     */
    app.post("/v1/key/company/create", async (request, reply) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const { name, readOnly, labels, ipAllowlist, expiresAt } = createKeyBodySchema.parse(request.body);
        // Generate new API key
        const rawKey = `hlk_${crypto.randomBytes(24).toString("hex")}`;
        const hashedKey = hashApiKey(rawKey);
        const prefix = rawKey.substring(0, 12);
        const apiKey = await prisma.apiKey.create({
            data: {
                companyId: ctx.company.id,
                workspaceId: null,
                name,
                prefix,
                hashedKey,
                type: ApiKeyType.COMPANY,
                readOnly,
                labels,
                ipAllowlist,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });
        return {
            id: apiKey.id,
            name: apiKey.name,
            prefix: apiKey.prefix,
            key: rawKey,
            readOnly: apiKey.readOnly,
            labels: apiKey.labels,
            expiresAt: apiKey.expiresAt,
            createdAt: apiKey.createdAt,
        };
    });
    /**
     * Rotate company API key
     * POST /v1/key/company/rotate
     */
    app.post("/v1/key/company/rotate", async (request, reply) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const { name, revokeOld } = rotateKeyBodySchema.parse(request.body);
        const rawKey = `hlk_${crypto.randomBytes(24).toString("hex")}`;
        const hashedKey = hashApiKey(rawKey);
        const prefix = rawKey.substring(0, 12);
        const newKey = await prisma.apiKey.create({
            data: {
                companyId: ctx.company.id,
                workspaceId: null,
                name: name || `${ctx.apiKey.name} (rotated)`,
                prefix,
                hashedKey,
                type: ApiKeyType.COMPANY,
                readOnly: ctx.apiKey.readOnly,
                labels: ctx.apiKey.labels,
                ipAllowlist: ctx.apiKey.ipAllowlist,
                rotatedFrom: ctx.apiKey.id,
            },
        });
        await prisma.apiKey.update({
            where: { id: ctx.apiKey.id },
            data: { rotatedTo: newKey.id },
        });
        if (revokeOld) {
            await prisma.apiKey.update({
                where: { id: ctx.apiKey.id },
                data: {
                    revokedAt: new Date(),
                    revokedReason: "Rotated and replaced",
                },
            });
        }
        return {
            id: newKey.id,
            name: newKey.name,
            prefix: newKey.prefix,
            key: rawKey,
            oldKeyRevoked: revokeOld,
            createdAt: newKey.createdAt,
        };
    });
    /**
     * Revoke company API key
     * POST /v1/key/company/revoke
     */
    app.post("/v1/key/company/revoke", async (request, reply) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const { reason } = revokeKeyBodySchema.parse(request.body);
        const revoked = await prisma.apiKey.update({
            where: { id: ctx.apiKey.id },
            data: {
                revokedAt: new Date(),
                revokedReason: reason || "Revoked by user",
            },
        });
        return {
            id: revoked.id,
            revokedAt: revoked.revokedAt,
            revokedReason: revoked.revokedReason,
        };
    });
    /**
     * Get company API key usage statistics and health metrics
     * GET /v1/key/company/stats
     */
    app.get("/v1/key/company/stats", async (request, reply) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const { from, to } = request.query;
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        const logs = await prisma.apiKeyLog.findMany({
            where: {
                apiKeyId: ctx.apiKey.id,
                createdAt: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
            select: {
                statusCode: true,
                latencyMs: true,
                createdAt: true,
                path: true,
            },
        });
        const totalRequests = logs.length;
        const successRequests = logs.filter((log) => log.statusCode < 400).length;
        const errorRequests = totalRequests - successRequests;
        const avgLatency = logs.length > 0 ? logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length : 0;
        const endpointStats = logs.reduce((acc, log) => {
            const endpoint = log.path;
            if (!acc[endpoint]) {
                acc[endpoint] = { count: 0, errors: 0, avgLatency: 0 };
            }
            acc[endpoint].count++;
            if (log.statusCode >= 400) {
                acc[endpoint].errors++;
            }
            acc[endpoint].avgLatency += log.latencyMs;
            return acc;
        }, {});
        Object.keys(endpointStats).forEach((endpoint) => {
            const stats = endpointStats[endpoint];
            if (stats) {
                stats.avgLatency /= stats.count;
            }
        });
        const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
        const healthScore = Math.max(0, Math.min(100, Math.round((1 - errorRate) * 100)));
        await prisma.apiKey.update({
            where: { id: ctx.apiKey.id },
            data: { healthScore },
        });
        return {
            apiKeyId: ctx.apiKey.id,
            period: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
            },
            summary: {
                totalRequests,
                successRequests,
                errorRequests,
                errorRate: totalRequests > 0 ? errorRate : 0,
                avgLatencyMs: Math.round(avgLatency),
                healthScore,
            },
            endpoints: endpointStats,
        };
    });
};
//# sourceMappingURL=key.company.lifecycle.js.map