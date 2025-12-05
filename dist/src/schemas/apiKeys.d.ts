import { z } from "zod";
export declare const companySummarySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    retentionDays: z.ZodNumber;
}, z.core.$strip>;
export declare const workspaceSummarySchema: z.ZodObject<{
    id: z.ZodString;
    companyId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
}, z.core.$strip>;
export declare const projectSummarySchema: z.ZodObject<{
    id: z.ZodString;
    workspaceId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=apiKeys.d.ts.map