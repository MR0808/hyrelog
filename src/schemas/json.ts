// src/schemas/json.ts
import { z } from 'zod';

/**
 * TypeScript representation of JSON.
 */
export type Json =
    | string
    | number
    | boolean
    | null
    | Json[]
    | { [key: string]: Json };

/**
 * Recursive Zod schema for JSON values (Zod 4-compatible)
 */
export const JsonSchema: z.ZodType<Json> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(JsonSchema),
        // correct record signature: z.record(keyType, valueType)
        z.record(z.string(), JsonSchema)
    ])
);
