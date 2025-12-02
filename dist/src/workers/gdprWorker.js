import { GdprRequestStatus, GdprRequestType, Region } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrismaForCompany, getAllRegions } from "@/lib/regionClient";
import { queryGlobalEvents } from "@/lib/regionBroker";
import crypto from "node:crypto";
/**
 * Anonymizes PII in an event.
 */
function anonymizeEvent(event) {
    return {
        ...event,
        actorId: event.actorId ? `anon_${crypto.randomBytes(8).toString("hex")}` : null,
        actorEmail: event.actorEmail ? `anon_${crypto.randomBytes(8).toString("hex")}@anonymized.local` : null,
        actorName: event.actorName ? "[Anonymized]" : null,
        payload: anonymizePayload(event.payload),
        metadata: anonymizeMetadata(event.metadata),
    };
}
/**
 * Anonymizes PII in payload.
 */
function anonymizePayload(payload) {
    if (!payload || typeof payload !== "object") {
        return payload;
    }
    const anonymized = { ...payload };
    // Common PII fields
    const piiFields = ["email", "emailAddress", "userEmail", "emailAddr"];
    for (const field of piiFields) {
        if (anonymized[field] && typeof anonymized[field] === "string") {
            anonymized[field] = `anon_${crypto.randomBytes(8).toString("hex")}@anonymized.local`;
        }
    }
    const nameFields = ["name", "userName", "fullName", "displayName"];
    for (const field of nameFields) {
        if (anonymized[field] && typeof anonymized[field] === "string") {
            anonymized[field] = "[Anonymized]";
        }
    }
    return anonymized;
}
/**
 * Anonymizes PII in metadata.
 */
function anonymizeMetadata(metadata) {
    if (!metadata || typeof metadata !== "object") {
        return metadata;
    }
    return anonymizePayload(metadata);
}
/**
 * Processes GDPR requests that are ready for execution.
 */
export async function processGdprRequests() {
    // Find requests that are ADMIN_APPROVED and ready to process
    const requests = await prisma.gdprRequest.findMany({
        where: {
            status: GdprRequestStatus.ADMIN_APPROVED,
        },
        orderBy: { createdAt: "asc" },
        take: 10, // Process in batches
    });
    for (const request of requests) {
        try {
            // Update status to PROCESSING
            await prisma.gdprRequest.update({
                where: { id: request.id },
                data: { status: GdprRequestStatus.PROCESSING },
            });
            // Get company's region
            const regionalPrisma = await getPrismaForCompany(request.companyId);
            if (request.requestType === GdprRequestType.ANONYMIZE) {
                await processAnonymization(request, regionalPrisma);
            }
            else if (request.requestType === GdprRequestType.DELETE) {
                await processDeletion(request, regionalPrisma);
            }
            // Mark as DONE
            await prisma.gdprRequest.update({
                where: { id: request.id },
                data: { status: GdprRequestStatus.DONE },
            });
        }
        catch (error) {
            console.error(`Failed to process GDPR request ${request.id}:`, error);
            // Mark as failed (you might want a FAILED status)
            await prisma.gdprRequest.update({
                where: { id: request.id },
                data: { status: GdprRequestStatus.REJECTED },
            });
        }
    }
}
/**
 * Processes anonymization request.
 */
async function processAnonymization(request, regionalPrisma) {
    // Find events matching the criteria
    const where = {
        companyId: request.companyId,
        archived: false,
    };
    if (request.actorEmail) {
        where.actorEmail = request.actorEmail;
    }
    if (request.actorId) {
        where.actorId = request.actorId;
    }
    // Process in batches
    let hasMore = true;
    let processed = 0;
    while (hasMore) {
        const events = await regionalPrisma.auditEvent.findMany({
            where,
            take: 100,
            select: {
                id: true,
                actorId: true,
                actorEmail: true,
                actorName: true,
                payload: true,
                metadata: true,
            },
        });
        if (events.length === 0) {
            hasMore = false;
            break;
        }
        for (const event of events) {
            const anonymized = anonymizeEvent(event);
            await regionalPrisma.auditEvent.update({
                where: { id: event.id },
                data: {
                    actorId: anonymized.actorId,
                    actorEmail: anonymized.actorEmail,
                    actorName: anonymized.actorName,
                    payload: anonymized.payload,
                    metadata: anonymized.metadata,
                },
            });
            processed++;
        }
    }
    console.log(`Anonymized ${processed} events for GDPR request ${request.id}`);
}
/**
 * Processes deletion request.
 * Note: We don't actually delete events to preserve hash chain integrity.
 * Instead, we anonymize them and mark them as deleted in metadata.
 */
async function processDeletion(request, regionalPrisma) {
    // For audit trail integrity, we don't delete events.
    // Instead, we anonymize them and mark as deleted.
    await processAnonymization(request, regionalPrisma);
    // Mark events as deleted in metadata
    const where = {
        companyId: request.companyId,
        archived: false,
    };
    if (request.actorEmail) {
        where.actorEmail = request.actorEmail;
    }
    if (request.actorId) {
        where.actorId = request.actorId;
    }
    const events = await regionalPrisma.auditEvent.findMany({
        where,
        select: { id: true, metadata: true },
    });
    for (const event of events) {
        const metadata = event.metadata || {};
        metadata.gdprDeleted = true;
        metadata.gdprDeletedAt = new Date().toISOString();
        metadata.gdprRequestId = request.id;
        await regionalPrisma.auditEvent.update({
            where: { id: event.id },
            data: { metadata },
        });
    }
}
//# sourceMappingURL=gdprWorker.js.map