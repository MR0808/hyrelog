import { JobStatus, JobType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
/**
 * Processes a GDPR export job by collecting all company data and generating an export file.
 */
export const processGdprExport = async (jobId) => {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { company: true },
    });
    if (!job || job.type !== JobType.GDPR_EXPORT) {
        throw new Error(`Job ${jobId} not found or invalid type`);
    }
    if (job.status !== JobStatus.PENDING) {
        throw new Error(`Job ${jobId} is not in PENDING status`);
    }
    await prisma.job.update({
        where: { id: jobId },
        data: {
            status: JobStatus.PROCESSING,
            startedAt: new Date(),
        },
    });
    try {
        // Collect all company data
        const [workspaces, projects, events, apiKeys, usageStats] = await Promise.all([
            prisma.workspace.findMany({
                where: { companyId: job.companyId },
                include: { projects: true },
            }),
            prisma.project.findMany({
                where: { companyId: job.companyId },
            }),
            prisma.auditEvent.findMany({
                where: { companyId: job.companyId },
                orderBy: { createdAt: "asc" },
            }),
            prisma.apiKey.findMany({
                where: { companyId: job.companyId },
                select: {
                    id: true,
                    name: true,
                    prefix: true,
                    type: true,
                    readOnly: true,
                    lastUsedAt: true,
                    createdAt: true,
                    revokedAt: true,
                },
            }),
            prisma.usageStats.findMany({
                where: { companyId: job.companyId },
            }),
        ]);
        const exportData = {
            company: {
                id: job.company.id,
                name: job.company.name,
                slug: job.company.slug,
                retentionDays: job.company.retentionDays,
                createdAt: job.company.createdAt,
                updatedAt: job.company.updatedAt,
            },
            workspaces,
            projects,
            events: events.map((e) => ({
                id: e.id,
                action: e.action,
                category: e.category,
                actorId: e.actorId,
                actorEmail: e.actorEmail,
                actorName: e.actorName,
                targetId: e.targetId,
                targetType: e.targetType,
                payload: e.payload,
                metadata: e.metadata,
                changes: e.changes,
                createdAt: e.createdAt,
            })),
            apiKeys,
            usageStats,
            exportedAt: new Date().toISOString(),
        };
        // In production, you would:
        // 1. Upload to S3/cloud storage
        // 2. Generate a signed URL
        // 3. Store the URL in job.result
        // For now, we'll store a placeholder
        const result = {
            format: "json",
            recordCount: {
                workspaces: workspaces.length,
                projects: projects.length,
                events: events.length,
                apiKeys: apiKeys.length,
                usageStats: usageStats.length,
            },
            // In production: downloadUrl: "https://s3.../export-{jobId}.json",
            downloadUrl: null,
            message: "Export ready. In production, downloadUrl would be provided.",
        };
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: JobStatus.COMPLETED,
                completedAt: new Date(),
                result: result,
            },
        });
    }
    catch (error) {
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: JobStatus.FAILED,
                completedAt: new Date(),
                error: error instanceof Error ? error.message : String(error),
            },
        });
        throw error;
    }
};
/**
 * Gets the next pending job of the specified type.
 */
export const getNextPendingJob = async (type) => {
    return prisma.job.findFirst({
        where: {
            type,
            status: JobStatus.PENDING,
        },
        orderBy: {
            createdAt: "asc",
        },
    });
};
/**
 * Worker function that processes pending jobs.
 * In production, this would run in a separate process/service.
 */
export const processJobQueue = async () => {
    const job = await getNextPendingJob(JobType.GDPR_EXPORT);
    if (!job) {
        return;
    }
    try {
        await processGdprExport(job.id);
    }
    catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
    }
};
//# sourceMappingURL=jobs.js.map