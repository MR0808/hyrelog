import crypto from "node:crypto";
import { ApiKeyType } from "@prisma/client";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { rateLimiter } from "@/lib/rateLimit";
export const API_KEY_HEADER = "x-hyrelog-key";
const AUTHORIZATION_PREFIX = "ApiKey ";
/**
 * Deterministically hash an API key using the shared secret salt.
 */
export const hashApiKey = (rawKey) => {
    return crypto.createHmac("sha256", env.API_KEY_SECRET).update(rawKey).digest("hex");
};
/**
 * Extracts a raw API key from headers.
 */
export const extractRawApiKey = (request) => {
    const headerKey = request.headers[API_KEY_HEADER] ?? request.headers[API_KEY_HEADER.toLowerCase()];
    if (typeof headerKey === "string" && headerKey.trim().length > 0) {
        return headerKey.trim();
    }
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith(AUTHORIZATION_PREFIX)) {
        return authHeader.slice(AUTHORIZATION_PREFIX.length).trim();
    }
    return null;
};
/**
 * Authenticates the incoming API key and attaches context to the request.
 */
export const authenticateApiKey = async (request, options = {}) => {
    const rawKey = extractRawApiKey(request);
    if (!rawKey) {
        throw request.server.httpErrors.unauthorized("API key missing");
    }
    const hashedKey = hashApiKey(rawKey);
    const apiKey = await prisma.apiKey.findFirst({
        where: {
            hashedKey,
            revokedAt: null,
        },
        include: {
            company: true,
            workspace: true,
        },
    });
    if (!apiKey) {
        throw request.server.httpErrors.unauthorized("Invalid API key");
    }
    if (options.allow && !options.allow.includes(apiKey.type)) {
        throw request.server.httpErrors.forbidden("API key is not permitted for this endpoint");
    }
    const context = {
        apiKey,
        company: apiKey.company,
        workspace: apiKey.workspace,
    };
    enforceRateLimit(request, `key:${apiKey.id}`, env.RATE_LIMIT_PER_KEY);
    request.apiKeyContext = context;
    return context;
};
const enforceRateLimit = (request, identifier, limit) => {
    const windowMs = env.RATE_LIMIT_WINDOW_SECONDS * 1000;
    const result = rateLimiter.consume(identifier, { limit, windowMs });
    if (result.limited) {
        throw request.server.httpErrors.tooManyRequests("API key rate limit exceeded");
    }
};
//# sourceMappingURL=apiKeyAuth.js.map