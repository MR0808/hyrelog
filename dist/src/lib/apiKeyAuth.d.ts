import type { FastifyRequest } from "fastify";
import { ApiKeyType } from "@prisma/client";
import type { ApiKeyContext } from "@/types/context";
export declare const API_KEY_HEADER = "x-hyrelog-key";
export type ApiKeyAuthOptions = {
    /**
     * Restrict allowed key types for a route.
     */
    allow?: ApiKeyType[];
};
/**
 * Deterministically hash an API key using the shared secret salt.
 */
export declare const hashApiKey: (rawKey: string) => string;
/**
 * Extracts a raw API key from headers.
 */
export declare const extractRawApiKey: (request: FastifyRequest) => string | null;
/**
 * Authenticates the incoming API key and attaches context to the request.
 */
export declare const authenticateApiKey: (request: FastifyRequest, options?: ApiKeyAuthOptions) => Promise<ApiKeyContext>;
//# sourceMappingURL=apiKeyAuth.d.ts.map