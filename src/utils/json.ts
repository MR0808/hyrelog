import { Prisma } from '../../src/generated/prisma/client';

export function asJson(
    value: unknown
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
    if (value === null || value === undefined) {
        return Prisma.DbNull; // Correct null for JSON columns
    }
    return value as Prisma.InputJsonValue;
}
