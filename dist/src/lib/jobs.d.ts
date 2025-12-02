import { JobType, type Prisma } from "@prisma/client";
/**
 * Processes a GDPR export job by collecting all company data and generating an export file.
 */
export declare const processGdprExport: (jobId: string) => Promise<void>;
/**
 * Gets the next pending job of the specified type.
 */
export declare const getNextPendingJob: (type: JobType) => Promise<{
    params: Prisma.JsonValue | null;
    type: import("@prisma/client").$Enums.JobType;
    status: import("@prisma/client").$Enums.JobStatus;
    error: string | null;
    result: Prisma.JsonValue | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    companyId: string;
    startedAt: Date | null;
    completedAt: Date | null;
} | null>;
/**
 * Worker function that processes pending jobs.
 * In production, this would run in a separate process/service.
 */
export declare const processJobQueue: () => Promise<void>;
//# sourceMappingURL=jobs.d.ts.map