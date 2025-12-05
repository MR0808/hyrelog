import { Region, DataRegion, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
    getPrismaForCompany,
    getPrismaForRegion,
    getRegionForCompany,
    getAllRegions
} from '@/lib/regionClient';
import type { IngestEventInput } from '@/schemas/events';
import {
    createAsyncSpan,
    setSpanAttributes,
    addSpanEvent,
    recordSpanException
} from '@/lib/otel';

/**
 * Ingests an event into the appropriate region.
 * Also writes metadata to GlobalEventIndex and queues replication if needed.
 */
export async function ingestEventToRegion(
    companyId: string,
    workspaceId: string,
    eventData: IngestEventInput & {
        hash: string;
        prevHash: string | null;
        traceId?: string;
    }
): Promise<Prisma.AuditEventGetPayload<{}>> {
    return createAsyncSpan('hyrelog.ingest_event', async (span) => {
        setSpanAttributes({
            'hyrelog.company_id': companyId,
            'hyrelog.workspace_id': workspaceId,
            'hyrelog.event.action': eventData.action,
            'hyrelog.event.category': eventData.category,
            'hyrelog.event.hash': eventData.hash
        });

        if (eventData.traceId) {
            span.setAttribute('hyrelog.trace_id', eventData.traceId);
        }

        try {
            // Get company's region
            const region = await getRegionForCompany(companyId);
            span.setAttribute('hyrelog.region', region);
            const regionalPrisma = await getPrismaForRegion(region);

            // Get company to check replication settings
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { replicateTo: true }
            });

            if (!company) {
                throw new Error(`Company not found: ${companyId}`);
            }

            // Write event to regional database
            addSpanEvent('hyrelog.event.write_start');
            const event = await regionalPrisma.auditEvent.create({
                data: {
                    companyId,
                    workspaceId,
                    projectId: eventData.projectId ?? null,
                    action: eventData.action,
                    category: eventData.category,
                    actorId: eventData.actor?.id ?? null,
                    actorEmail: eventData.actor?.email ?? null,
                    actorName: eventData.actor?.name ?? null,
                    targetId: eventData.target?.id ?? null,
                    targetType: eventData.target?.type ?? null,
                    payload: eventData.payload as any,
                    metadata: eventData.metadata as any,
                    changes: eventData.changes as any,
                    hash: eventData.hash,
                    prevHash: eventData.prevHash,
                    traceId: eventData.traceId ?? null,
                    dataRegion: region as DataRegion,
                    createdAt:
                        (eventData as typeof eventData & { createdAt?: Date })
                            .createdAt ?? new Date()
                }
            });
            addSpanEvent('hyrelog.event.write_complete', {
                'hyrelog.event.id': event.id
            });

            // Write metadata to GlobalEventIndex (in primary DB)
            await prisma.globalEventIndex.create({
                data: {
                    id: event.id,
                    companyId,
                    workspaceId,
                    projectId: eventData.projectId ?? null,
                    dataRegion: region,
                    occurredAt: event.createdAt,
                    action: eventData.action,
                    category: eventData.category,
                    actorId: eventData.actor?.id ?? null,
                    actorEmail: eventData.actor?.email ?? null
                }
            });

            // Queue replication jobs if company has replicateTo configured
            if (company.replicateTo.length > 0) {
                addSpanEvent('hyrelog.replication.queued', {
                    'hyrelog.replication.regions': company.replicateTo.join(',')
                });
                // TODO: Create replication job entries
            }

            span.setAttribute('hyrelog.event.id', event.id);
            return event;
        } catch (error) {
            recordSpanException(
                error instanceof Error ? error : new Error(String(error)),
                {
                    'hyrelog.error.type': 'ingestion_failed'
                }
            );
            throw error;
        }
    });
}

/**
 * Queries events from a workspace's region.
 */
export async function queryWorkspaceEvents(
    workspaceId: string,
    filters: {
        page?: number;
        limit?: number;
        action?: string;
        category?: string;
        actorId?: string;
        actorEmail?: string;
        projectId?: string;
        from?: Date;
        to?: Date;
    }
): Promise<{ events: Prisma.AuditEventGetPayload<{}>[]; total: number }> {
    // Get workspace to find company
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { companyId: true }
    });

    if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Get regional Prisma client
    const regionalPrisma = await getPrismaForCompany(workspace.companyId);

    // Build where clause
    const where: any = {
        workspaceId,
        archived: false
    };

    if (filters.action) {
        where.action = filters.action;
    }
    if (filters.category) {
        where.category = filters.category;
    }
    if (filters.actorId) {
        where.actorId = filters.actorId;
    }
    if (filters.actorEmail) {
        where.actorEmail = filters.actorEmail;
    }
    if (filters.projectId) {
        where.projectId = filters.projectId;
    }
    if (filters.from || filters.to) {
        where.createdAt = {};
        if (filters.from) {
            where.createdAt.gte = filters.from;
        }
        if (filters.to) {
            where.createdAt.lte = filters.to;
        }
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
        regionalPrisma.auditEvent.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        regionalPrisma.auditEvent.count({ where })
    ]);

    return { events, total };
}

/**
 * Queries events from a company's primary region.
 */
export async function queryCompanyEvents(
    companyId: string,
    filters: {
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
    }
): Promise<{ events: Prisma.AuditEventGetPayload<{}>[]; total: number }> {
    // Get regional Prisma client
    const regionalPrisma = await getPrismaForCompany(companyId);

    // Build where clause
    const where: any = {
        companyId,
        archived: false
    };

    if (filters.action) {
        where.action = filters.action;
    }
    if (filters.category) {
        where.category = filters.category;
    }
    if (filters.actorId) {
        where.actorId = filters.actorId;
    }
    if (filters.actorEmail) {
        where.actorEmail = filters.actorEmail;
    }
    if (filters.workspaceId) {
        where.workspaceId = filters.workspaceId;
    }
    if (filters.projectId) {
        where.projectId = filters.projectId;
    }
    if (filters.from || filters.to) {
        where.createdAt = {};
        if (filters.from) {
            where.createdAt.gte = filters.from;
        }
        if (filters.to) {
            where.createdAt.lte = filters.to;
        }
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
        regionalPrisma.auditEvent.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        regionalPrisma.auditEvent.count({ where })
    ]);

    return { events, total };
}

/**
 * Performs a global multi-region search.
 * Uses GlobalEventIndex for metadata lookup, then fetches full events from regional DBs.
 */
export async function queryGlobalEvents(
    companyId: string,
    filters: {
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
    }
): Promise<{ events: Prisma.AuditEventGetPayload<{}>[]; total: number }> {
    // Query GlobalEventIndex for matching event IDs
    const indexWhere: any = {
        companyId
    };

    if (filters.action) {
        indexWhere.action = filters.action;
    }
    if (filters.category) {
        indexWhere.category = filters.category;
    }
    if (filters.actorId) {
        indexWhere.actorId = filters.actorId;
    }
    if (filters.actorEmail) {
        indexWhere.actorEmail = filters.actorEmail;
    }
    if (filters.workspaceId) {
        indexWhere.workspaceId = filters.workspaceId;
    }
    if (filters.projectId) {
        indexWhere.projectId = filters.projectId;
    }
    if (filters.from || filters.to) {
        indexWhere.occurredAt = {};
        if (filters.from) {
            indexWhere.occurredAt.gte = filters.from;
        }
        if (filters.to) {
            indexWhere.occurredAt.lte = filters.to;
        }
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    // Get metadata from index
    const indexEntries = await prisma.globalEventIndex.findMany({
        where: indexWhere,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
        select: {
            id: true,
            dataRegion: true
        }
    });

    const total = await prisma.globalEventIndex.count({ where: indexWhere });

    // Group by region
    const eventsByRegion = new Map<Region, string[]>();
    for (const entry of indexEntries) {
        if (!eventsByRegion.has(entry.dataRegion)) {
            eventsByRegion.set(entry.dataRegion, []);
        }
        eventsByRegion.get(entry.dataRegion)!.push(entry.id);
    }

    // Fetch full events from each region
    const allEvents: Prisma.AuditEventGetPayload<{}>[] = [];
    for (const [region, eventIds] of eventsByRegion) {
        const regionalPrisma = await getPrismaForRegion(region);
        const events = await regionalPrisma.auditEvent.findMany({
            where: {
                id: { in: eventIds },
                archived: false
            }
        });
        allEvents.push(...events);
    }

    // Sort by occurredAt descending (matching index order)
    allEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return { events: allEvents, total };
}
