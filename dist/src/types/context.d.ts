import type { ApiKey, Company, Workspace } from "@prisma/client";
/**
 * Context injected into every authenticated API request.
 */
export type ApiKeyContext = {
    apiKey: ApiKey;
    company: Company;
    workspace?: Workspace | null;
};
export type RequestMeta = {
    clientIp: string;
    userAgent?: string;
};
declare module "fastify" {
    interface FastifyRequest {
        apiKeyContext?: ApiKeyContext;
        requestMeta?: RequestMeta;
        requestStartTime?: number;
    }
}
//# sourceMappingURL=context.d.ts.map