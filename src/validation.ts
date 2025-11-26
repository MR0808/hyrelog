import { z } from 'zod';

export const createWorkspaceSchema = z.object({
    name: z.string().min(1),
    slug: z.string().optional()
});

export const createEventSchema = z.object({
    type: z.string().min(1),
    timestamp: z.iso.datetime().optional(),
    actor: z
        .object({
            id: z.string().optional(),
            type: z.string().optional(),
            name: z.string().optional(),
            email: z.email().optional()
        })
        .optional(),
    source: z
        .object({
            ip: z.string().optional(),
            userAgent: z.string().optional()
        })
        .optional(),
    // IMPORTANT: use 2-arg version of record to avoid TS error
    metadata: z.record(z.string(), z.unknown()).optional(),
    before: z.record(z.string(), z.unknown()).optional(),
    after: z.record(z.string(), z.unknown()).optional()
});
