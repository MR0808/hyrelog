import { Prisma } from '../generated/prisma/client';

/**
 * Safely cast arbitrary JSON-like values into Prisma JSON-compatible values.
 * Prisma 7 requires DbNull for explicit JSON null writes.
 */
export function toJson(
    value: unknown
): Prisma.InputJsonValue | typeof Prisma.NullTypes.DbNull {
    if (value === undefined || value === null) {
        return Prisma.NullTypes.DbNull;
    }

    return value as Prisma.InputJsonValue;
}
