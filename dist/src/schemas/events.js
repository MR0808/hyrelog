import { z } from "zod";
export const actorSchema = z
    .object({
    id: z.string().min(1).optional(),
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
})
    .partial();
export const targetSchema = z
    .object({
    id: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
})
    .partial();
export const changeSchema = z.object({
    field: z.string().min(1),
    old: z.any().optional(),
    new: z.any().optional(),
});
export const ingestEventSchema = z.object({
    action: z.string().min(1),
    category: z.string().min(1),
    actor: actorSchema.optional(),
    target: targetSchema.optional(),
    projectId: z.string().min(1).optional(),
    payload: z.record(z.any()).default({}),
    metadata: z.record(z.any()).optional(),
    /**
     * Changes array for tracking field updates (e.g., user.name: old="John", new="Jane").
     * Each change represents a field that was modified.
     */
    changes: z.array(changeSchema).optional(),
});
export const eventFilterSchema = z.object({
    from: z
        .string()
        .optional()
        .transform((value) => (value ? new Date(value) : undefined))
        .refine((value) => (value ? !Number.isNaN(value.getTime()) : true), "Invalid from date"),
    to: z
        .string()
        .optional()
        .transform((value) => (value ? new Date(value) : undefined))
        .refine((value) => (value ? !Number.isNaN(value.getTime()) : true), "Invalid to date"),
    action: z.string().optional(),
    category: z.string().optional(),
    actorId: z.string().optional(),
    actorEmail: z.string().optional(),
    workspaceId: z.string().optional(),
    projectId: z.string().optional(),
});
//# sourceMappingURL=events.js.map