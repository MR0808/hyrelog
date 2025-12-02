import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';
const databaseUrl = env.DATABASE_URL;
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = databaseUrl;
}
const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prismaClient = globalThis.prisma ?? new PrismaClient({ adapter });
if (!globalThis.prisma) {
    globalThis.prisma = prismaClient;
}
/**
 * Singleton Prisma client shared across the app.
 */
export const prisma = prismaClient;
//# sourceMappingURL=prisma.js.map