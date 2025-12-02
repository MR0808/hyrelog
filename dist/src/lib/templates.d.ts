import type { Prisma } from "@prisma/client";
import { z } from "zod";
export declare const templateConfigSchema: z.ZodObject<{
    requiredActorFields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    requiredMetadataKeys: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    defaultCategories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    retentionOverride: z.ZodOptional<z.ZodNumber>;
    requireProject: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    requiredActorFields?: string[] | undefined;
    requiredMetadataKeys?: string[] | undefined;
    defaultCategories?: string[] | undefined;
    retentionOverride?: number | undefined;
    requireProject?: boolean | undefined;
}, {
    requiredActorFields?: string[] | undefined;
    requiredMetadataKeys?: string[] | undefined;
    defaultCategories?: string[] | undefined;
    retentionOverride?: number | undefined;
    requireProject?: boolean | undefined;
}>;
export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type EventValidationInput = {
    action: string;
    category: string;
    actor?: {
        id?: string;
        email?: string;
        name?: string;
    } | undefined;
    metadata?: Record<string, unknown> | undefined;
    projectId?: string | undefined;
};
/**
 * Gets the template assigned to a workspace.
 */
export declare const getWorkspaceTemplate: (workspaceId: string) => Promise<{
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    companyId: string | null;
    config: Prisma.JsonValue;
} | null>;
/**
 * Validates an event against template rules.
 */
export declare const validateEventWithTemplate: (event: EventValidationInput, template: {
    config: Prisma.JsonValue;
}) => {
    valid: boolean;
    errors: string[];
};
/**
 * Applies template retention override to workspace.
 */
export declare const applyTemplateToWorkspace: (workspaceId: string, template: {
    config: Prisma.JsonValue;
}) => Promise<void>;
//# sourceMappingURL=templates.d.ts.map