import { JobType, type Prisma } from "@prisma/client";
/**
 * Processes a GDPR export job by collecting all company data and generating an export file.
 */
export declare const processGdprExport: (jobId: string) => Promise<void>;
/**
 * Gets the next pending job of the specified type.
 */
export declare const getNextPendingJob: (type: JobType) => Promise<{
    type: import("@prisma/client").$Enums.JobType;
    error: string | null;
    params: Prisma.JsonValue | null;
    result: Prisma.JsonValue | null;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    companyId: string;
    status: import("@prisma/client").$Enums.JobStatus;
    startedAt: Date | null;
    completedAt: Date | null;
} | null>;
/**
 * Worker function that processes pending jobs.
 * In production, this would run in a separate process/service.
 */
export declare const processJobQueue: () => Promise<void>;
//# sourceMappingURL=jobs.d.ts.map