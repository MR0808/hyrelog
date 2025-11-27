// src/schemas/json.ts
import { z } from 'zod';

/**
 * TypeScript representation of any JSON value.
 */
export type Json =
    | string
    | number
    | boolean
    | null
    | Json[]
    | { [key: string]: Json };

/**
 * Zod schema for any JSON value.
 *
 * - Uses z.lazy for recursion (Zod 4 compatible)
 * - Uses explicit type parameter: ZodType<Json>
 * - Uses correct z.record(keyType, valueType) signature
 */
export const JsonSchema: z.ZodType<Json> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(JsonSchema),
        z.record(z.string(), JsonSchema)
    ])
);
