import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
    interface FastifyRequest {
        auth?: {
            apiKeyId: string;
            scope: 'COMPANY' | 'WORKSPACE';
            companyId: string;
            workspaceId?: string | null;
        };
        startTime?: number;
    }

    interface FastifyInstance {
        authenticate(
            request: FastifyRequest,
            reply: FastifyReply
        ): Promise<void>;
        logApiKeyRequest(
            request: FastifyRequest,
            reply: FastifyReply,
            durationMs: number
        ): Promise<void>;
        enforceCompanyMeter(
            meter: 'EVENTS' | 'EXPORTS'
        ): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        incrementCompanyMeter(
            meter: 'EVENTS' | 'EXPORTS',
            companyId: string,
            workspaceId?: string | null,
            amount?: number
        ): Promise<void>;
    }
}
