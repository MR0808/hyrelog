"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonSchema = void 0;
// src/schemas/json.ts
const zod_1 = require("zod");
/**
 * Zod schema for any JSON value.
 *
 * - Uses z.lazy for recursion (Zod 4 compatible)
 * - Uses explicit type parameter: ZodType<Json>
 * - Uses correct z.record(keyType, valueType) signature
 */
exports.JsonSchema = zod_1.z.lazy(() => zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.number(),
    zod_1.z.boolean(),
    zod_1.z.null(),
    zod_1.z.array(exports.JsonSchema),
    zod_1.z.record(zod_1.z.string(), exports.JsonSchema)
]));
