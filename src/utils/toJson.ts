// src/utils/toJson.ts
import { Prisma } from '../generated/prisma/client';

/**
 * Convert arbitrary JS values into Prisma JSON type safely.
 *
 * Prisma 7 JSON rules:
 *  - Use Prisma.JsonNull for JSON `null`
 *  - Use undefined to omit a field
 *  - Use regular JS values for valid JSON
 */
export function toJson(
    value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        // JSON null, NOT DB null
        return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
}
