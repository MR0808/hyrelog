import { z } from "zod";
import { prisma } from "@/lib/prisma";
export const templateConfigSchema = z.object({
    requiredActorFields: z.array(z.string()).optional(),
    requiredMetadataKeys: z.array(z.string()).optional(),
    defaultCategories: z.array(z.string()).optional(),
    retentionOverride: z.number().int().positive().optional(),
    requireProject: z.boolean().optional(),
});
/**
 * Gets the template assigned to a workspace.
 */
export const getWorkspaceTemplate = async (workspaceId) => {
    const assignment = await prisma.workspaceTemplateAssignment.findUnique({
        where: {
            workspaceId,
        },
        include: {
            template: true,
        },
    });
    return assignment?.template ?? null;
};
/**
 * Validates an event against template rules.
 */
export const validateEventWithTemplate = (event, template) => {
    const errors = [];
    const config = template.config;
    // Validate required actor fields
    if (config.requiredActorFields && config.requiredActorFields.length > 0) {
        for (const field of config.requiredActorFields) {
            if (!event.actor || !event.actor[field]) {
                errors.push(`Missing required actor field: ${field}`);
            }
        }
    }
    // Validate required metadata keys
    if (config.requiredMetadataKeys && config.requiredMetadataKeys.length > 0) {
        for (const key of config.requiredMetadataKeys) {
            if (!event.metadata || !(key in event.metadata)) {
                errors.push(`Missing required metadata key: ${key}`);
            }
        }
    }
    // Validate project requirement
    if (config.requireProject && !event.projectId) {
        errors.push("Project ID is required by template");
    }
    // Validate category (if defaultCategories specified)
    if (config.defaultCategories && config.defaultCategories.length > 0) {
        if (!config.defaultCategories.includes(event.category)) {
            errors.push(`Category must be one of: ${config.defaultCategories.join(", ")}`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
};
/**
 * Applies template retention override to workspace.
 */
export const applyTemplateToWorkspace = async (workspaceId, template) => {
    const config = template.config;
    if (config.retentionOverride) {
        await prisma.workspace.update({
            where: {
                id: workspaceId,
            },
            data: {
                retentionDays: config.retentionOverride,
            },
        });
    }
};
//# sourceMappingURL=templates.js.map