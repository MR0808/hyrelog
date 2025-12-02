/**
 * Rate limit status endpoints for company keys
 * Phase 4: Rate Limit Enhancements
 */

import type { FastifyPluginAsync } from "fastify";
import { ApiKeyType } from "@prisma/client";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { rateLimiter } from "@/lib/rateLimit";
import { env } from "@/config/env";

export const keyCompanyRateLimitRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Get rate limit status for company key
   * GET /v1/key/company/rate-limit
   */
  app.get("/v1/key/company/rate-limit", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });

    const identifier = `key:${ctx.apiKey.id}`;
    const status = rateLimiter.getStatus(identifier);

    const limit = env.RATE_LIMIT_PER_KEY;
    const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;

    if (!status) {
      // No current bucket, return default limits
      return {
        limit,
        remaining: limit,
        resetAt: new Date(Date.now() + windowMs).toISOString(),
        windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
      };
    }

    return {
      limit,
      remaining: status.remaining,
      resetAt: new Date(status.resetAt).toISOString(),
      windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
      limited: status.limited,
    };
  });
};

