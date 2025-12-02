import type { Prisma } from "@prisma/client";
import { z } from "zod";
import type { Company, Workspace } from "@prisma/client";
export declare const exportLimitSchema: z.ZodObject<{
    free: z.ZodDefault<z.ZodNumber>;
    starter: z.ZodDefault<z.ZodNumber>;
    growth: z.ZodDefault<z.ZodNumber>;
    scale: z.ZodDefault<z.ZodNumber>;
    enterprise: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    free: number;
    starter: number;
    growth: number;
    scale: number;
    enterprise: number;
}, {
    free?: number | undefined;
    starter?: number | undefined;
    growth?: number | undefined;
    scale?: number | undefined;
    enterprise?: number | undefined;
}>;
export type ExportLimits = z.infer<typeof exportLimitSchema>;
export declare const EXPORT_LIMITS: ExportLimits;
/**
 * Gets export limit for a company based on plan.
 */
export declare const getExportLimit: (companyId: string) => Promise<number>;
/**
 * Builds event query for exports with retention awareness.
 */
export declare const buildExportQuery: (input: {
    company: Company;
    workspace?: Workspace | null;
    filters?: {
        from?: Date;
        to?: Date;
        action?: string;
        category?: string;
    };
}) => Prisma.AuditEventWhereInput;
/**
 * Streams events for export with pagination.
 */
export declare function streamEventsForExport(input: {
    where: Prisma.AuditEventWhereInput;
    limit: number;
    batchSize?: number;
}): AsyncGenerator<Array<Prisma.AuditEventGetPayload<{}>>, void, unknown>;
//# sourceMappingURL=exports.d.ts.map