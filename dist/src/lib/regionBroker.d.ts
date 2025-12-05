import { Prisma } from '@prisma/client';
import type { IngestEventInput } from '@/schemas/events';
/**
 * Ingests an event into the appropriate region.
 * Also writes metadata to GlobalEventIndex and queues replication if needed.
 */
export declare function ingestEventToRegion(companyId: string, workspaceId: string, eventData: IngestEventInput & {
    hash: string;
    prevHash: string | null;
    traceId?: string;
}): Promise<Prisma.AuditEventGetPayload<{}>>;
/**
 * Queries events from a workspace's region.
 */
export declare function queryWorkspaceEvents(workspaceId: string, filters: {
    page?: number;
    limit?: number;
    action?: string;
    category?: string;
    actorId?: string;
    actorEmail?: string;
    projectId?: string;
    from?: Date;
    to?: Date;
}): Promise<{
    events: Prisma.AuditEventGetPayload<{}>[];
    total: number;
}>;
/**
 * Queries events from a company's primary region.
 */
export declare function queryCompanyEvents(companyId: string, filters: {
    page?: number;
    limit?: number;
    action?: string;
    category?: string;
    actorId?: string;
    actorEmail?: string;
    workspaceId?: string;
    projectId?: string;
    from?: Date;
    to?: Date;
}): Promise<{
    events: Prisma.AuditEventGetPayload<{}>[];
    total: number;
}>;
/**
 * Performs a global multi-region search.
 * Uses GlobalEventIndex for metadata lookup, then fetches full events from regional DBs.
 */
export declare function queryGlobalEvents(companyId: string, filters: {
    page?: number;
    limit?: number;
    action?: string;
    category?: string;
    actorId?: string;
    actorEmail?: string;
    workspaceId?: string;
    projectId?: string;
    from?: Date;
    to?: Date;
}): Promise<{
    events: Prisma.AuditEventGetPayload<{}>[];
    total: number;
}>;
//# sourceMappingURL=regionBroker.d.ts.map