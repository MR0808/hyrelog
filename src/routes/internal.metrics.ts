import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { WebhookDeliveryStatus } from "@prisma/client";

const internalTokenSchema = z.string().min(32);

/**
 * Middleware to verify internal token.
 */
const verifyInternalToken = (request: { headers: Record<string, unknown> }): void => {
  const token = request.headers["x-internal-token"];
  if (!token || typeof token !== "string") {
    throw new Error("Missing x-internal-token header");
  }

  if (!env.INTERNAL_TOKEN || token !== env.INTERNAL_TOKEN) {
    throw new Error("Invalid internal token");
  }
};

export const internalMetricsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/internal/metrics", async (request) => {
    verifyInternalToken(request);

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last5min = new Date(now.getTime() - 5 * 60 * 1000);

    // Pending webhooks
    const pendingWebhooks = await prisma.webhookDelivery.count({
      where: {
        status: WebhookDeliveryStatus.PENDING,
      },
    });

    const failedWebhooks = await prisma.webhookDelivery.count({
      where: {
        status: WebhookDeliveryStatus.FAILED,
        nextAttemptAt: {
          lte: now,
        },
      },
    });

    // Events ingested in last 24h
    const eventsIngested = await prisma.auditEvent.count({
      where: {
        createdAt: {
          gte: last24h,
        },
      },
    });

    // DB latency check
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    // API key usage last 5 minutes
    const apiKeyUsage = await prisma.apiKeyLog.count({
      where: {
        createdAt: {
          gte: last5min,
        },
      },
    });

    return {
      webhooks: {
        pending: pendingWebhooks,
        failed: failedWebhooks,
      },
      events: {
        ingestedLast24h: eventsIngested,
      },
      database: {
        latencyMs: dbLatency,
      },
      apiKeys: {
        requestsLast5min: apiKeyUsage,
      },
      timestamp: now.toISOString(),
    };
  });
};

