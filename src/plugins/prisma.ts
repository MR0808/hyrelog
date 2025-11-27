// src/plugins/prisma.ts
import fp from 'fastify-plugin';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;

declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

const adapter = new PrismaPg({ connectionString });

export const prismaPlugin = fp(async (fastify) => {
    const prisma = new PrismaClient({ adapter }); // <-- CORRECT for Prisma 7
    fastify.decorate('prisma', prisma);

    fastify.addHook('onClose', async () => {
        await prisma.$disconnect();
    });
});
