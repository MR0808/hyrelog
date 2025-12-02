import { Region, DataRegion } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrismaForRegion, getPrismaForCompany } from "@/lib/regionClient";
import { computeEventHash } from "@/lib/hashchain";
/**
 * Replicates events from primary region to replica regions.
 */
export async function processReplicationJobs() {
    // Get all companies with replication configured
    const companies = await prisma.company.findMany({
        where: {
            replicateTo: {
                isEmpty: false,
            },
        },
        select: {
            id: true,
            dataRegion: true,
            replicateTo: true,
        },
    });
    for (const company of companies) {
        try {
            await replicateCompanyEvents(company.id, company.dataRegion, company.replicateTo);
        }
        catch (error) {
            console.error(`Failed to replicate events for company ${company.id}:`, error);
        }
    }
}
/**
 * Replicates events for a company to replica regions.
 */
async function replicateCompanyEvents(companyId, primaryRegion, replicaRegions) {
    const primaryPrisma = await getPrismaForRegion(primaryRegion);
    // Get recent events that haven't been replicated yet
    // In production, you'd track replication status per event
    const events = await primaryPrisma.auditEvent.findMany({
        where: {
            companyId,
            archived: false,
            createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
        },
        orderBy: { createdAt: "asc" },
        take: 1000,
    });
    for (const replicaRegion of replicaRegions) {
        const replicaPrisma = await getPrismaForRegion(replicaRegion);
        for (const event of events) {
            try {
                // Check if event already exists in replica
                const existing = await replicaPrisma.auditEvent.findUnique({
                    where: { id: event.id },
                });
                if (existing) {
                    continue; // Already replicated
                }
                // Get previous hash from replica region
                const prevEvent = await replicaPrisma.auditEvent.findFirst({
                    where: {
                        companyId: event.companyId,
                        workspaceId: event.workspaceId,
                    },
                    orderBy: { createdAt: "desc" },
                    select: { hash: true },
                });
                const prevHash = prevEvent?.hash ?? null;
                // Compute hash for replica (should match primary)
                const hash = computeEventHash({
                    workspaceId: event.workspaceId,
                    companyId: event.companyId,
                    projectId: event.projectId ?? null,
                    action: event.action,
                    category: event.category,
                    payload: event.payload,
                    metadata: event.metadata,
                    actorId: event.actorId ?? null,
                    actorEmail: event.actorEmail ?? null,
                    actorName: event.actorName ?? null,
                    createdAt: event.createdAt,
                }, prevHash);
                // Create event in replica region
                await replicaPrisma.auditEvent.create({
                    data: {
                        id: event.id,
                        companyId: event.companyId,
                        workspaceId: event.workspaceId,
                        projectId: event.projectId ?? null,
                        action: event.action,
                        category: event.category,
                        actorId: event.actorId ?? null,
                        actorEmail: event.actorEmail ?? null,
                        actorName: event.actorName ?? null,
                        targetId: event.targetId ?? null,
                        targetType: event.targetType ?? null,
                        payload: event.payload,
                        metadata: event.metadata,
                        changes: event.changes,
                        hash,
                        prevHash,
                        traceId: event.traceId ?? null,
                        dataRegion: replicaRegion, // Region enum matches DataRegion enum
                        archived: event.archived,
                        archivalCandidate: event.archivalCandidate,
                        createdAt: event.createdAt,
                    },
                });
            }
            catch (error) {
                console.error(`Failed to replicate event ${event.id} to ${replicaRegion}:`, error);
                // Continue with other events
            }
        }
    }
}
//# sourceMappingURL=replicationWorker.js.map