// src/types/fastify.d.ts
import 'fastify';
import { CompanyRole, WorkspaceRole } from '@prisma/client';

declare module 'fastify' {
    interface FastifyRequest {
        // API key auth (ingest)
        auth?: {
            workspaceId: string;
            apiKeyId: string;
        };

        // User auth (dashboard / company APIs)
        user?: {
            id: string;
            email: string;
        } | null;

        // Company RBAC
        companyContext?: {
            companyId: string;
            role: CompanyRole;
        };

        // Workspace RBAC
        workspaceContext?: {
            workspaceId: string;
            role: WorkspaceRole;
        };
    }

    interface FastifyInstance {
        authenticate(
            request: FastifyRequest,
            reply: FastifyReply
        ): Promise<void>;

        // RBAC guards
        requireCompanyRole(roles: CompanyRole[]): any;
        requireWorkspaceRole(roles: WorkspaceRole[]): any;

        // Usage caps
        enforceMeter(meter: 'EVENTS' | 'WORKSPACES' | 'USERS'): any;
    }
}
