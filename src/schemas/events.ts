// src/schemas/events.ts
import { z } from 'zod';
import { JsonSchema } from './json';

// -------------------------------
// EVENT INGEST (Workspace API Key)
// -------------------------------
export const EventIngestSchema = z.object({
    type: z.string().min(1, 'Event type is required'),

    actorId: z.string().optional(),
    actorType: z.string().optional(),
    actorName: z.string().optional(),
    actorEmail: z.string().optional(),

    metadata: JsonSchema.optional(),
    before: JsonSchema.optional(),
    after: JsonSchema.optional()
});

export type EventIngestInput = z.infer<typeof EventIngestSchema>;

// -------------------------------
// EVENT QUERY
// -------------------------------
export const EventQuerySchema = z.object({
    workspaceId: z.string().optional(),
    type: z.string().optional(),
    actorId: z.string().optional(),

    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),

    q: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().optional()
});

export type EventQuery = z.infer<typeof EventQuerySchema>;

// -------------------------------
// EVENT EXPORT
// -------------------------------
export const EventExportSchema = EventQuerySchema.extend({
    format: z.enum(['json', 'ndjson', 'csv']).default('json')
});

export type EventExportQuery = z.infer<typeof EventExportSchema>;
