"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonSchema = void 0;
// src/schemas/json.ts
const zod_1 = require("zod");
/**
 * Recursive Zod schema for JSON values (Zod 4-compatible)
 */
exports.JsonSchema = zod_1.z.lazy(() => zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.number(),
    zod_1.z.boolean(),
    zod_1.z.null(),
    zod_1.z.array(exports.JsonSchema),
    // correct record signature: z.record(keyType, valueType)
    zod_1.z.record(zod_1.z.string(), exports.JsonSchema)
]));
