import { z } from "zod";
export declare const companySummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    retentionDays: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    slug: string;
    retentionDays: number;
}, {
    name: string;
    id: string;
    slug: string;
    retentionDays: number;
}>;
export declare const workspaceSummarySchema: z.ZodObject<{
    id: z.ZodString;
    companyId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    companyId: string;
    slug: string;
}, {
    name: string;
    id: string;
    companyId: string;
    slug: string;
}>;
export declare const projectSummarySchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    workspaceId: string;
    slug: string;
}, {
    name: string;
    id: string;
    workspaceId: string;
    slug: string;
}>;
//# sourceMappingURL=apiKeys.d.ts.map