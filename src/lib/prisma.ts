import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClient = globalThis.prisma ?? new PrismaClient();

if (!globalThis.prisma) {
  globalThis.prisma = prismaClient;
}

/**
 * Singleton Prisma client shared across the app.
 */
export const prisma = prismaClient;

