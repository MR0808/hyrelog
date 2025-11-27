"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventExportSchema = exports.EventQuerySchema = exports.EventIngestSchema = void 0;
// src/schemas/events.ts
const zod_1 = require("zod");
const json_1 = require("./json");
// -------------------------------
// EVENT INGEST (Workspace API Key)
// -------------------------------
exports.EventIngestSchema = zod_1.z.object({
    type: zod_1.z.string().min(1, 'Event type is required'),
    actorId: zod_1.z.string().optional(),
    actorType: zod_1.z.string().optional(),
    actorName: zod_1.z.string().optional(),
    actorEmail: zod_1.z.string().optional(),
    // JSON payloads (metadata / before / after)
    // Validated as arbitrary JSON values via JsonSchema
    metadata: json_1.JsonSchema.optional(),
    before: json_1.JsonSchema.optional(),
    after: json_1.JsonSchema.optional()
});
// -------------------------------
// EVENT QUERY
// -------------------------------
exports.EventQuerySchema = zod_1.z.object({
    // For company-scoped keys, workspaceId can be specified
    workspaceId: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    actorId: zod_1.z.string().optional(),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    q: zod_1.z.string().optional(),
    cursor: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().optional()
});
// -------------------------------
// EVENT EXPORT
// -------------------------------
exports.EventExportSchema = exports.EventQuerySchema.extend({
    format: zod_1.z.enum(['json', 'ndjson', 'csv']).default('json')
});
