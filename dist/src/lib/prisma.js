import { PrismaClient } from "@prisma/client";
const prismaClient = globalThis.prisma ?? new PrismaClient();
if (!globalThis.prisma) {
    globalThis.prisma = prismaClient;
}
/**
 * Singleton Prisma client shared across the app.
 */
export const prisma = prismaClient;
//# sourceMappingURL=prisma.js.map