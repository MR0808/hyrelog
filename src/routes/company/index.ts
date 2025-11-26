import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { CompanyRole } from '../../generated/prisma/client';

const createCompanySchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1)
});

export async function companyRoutes(fastify: FastifyInstance) {
    fastify.post('/v1/companies', async (request, reply) => {
        if (!request.user) {
            reply.code(401).send({ error: 'Unauthenticated' });
            return;
        }

        const parsed = createCompanySchema.safeParse(request.body);
        if (!parsed.success) {
            reply.code(400).send({ error: parsed.error.flatten() });
            return;
        }

        const { name, slug } = parsed.data;

        const company = await prisma.company.create({
            data: {
                name,
                slug,
                companyUsers: {
                    create: {
                        userId: request.user.id,
                        role: CompanyRole.OWNER
                    }
                }
            }
        });

        reply.code(201).send(company);
    });

    fastify.get(
        '/v1/companies/me',
        {
            preHandler: fastify.requireCompanyRole([
                CompanyRole.OWNER,
                CompanyRole.ADMIN,
                CompanyRole.MEMBER
            ])
        },
        async (request) => {
            const ctx = request.companyContext!;
            const company = await prisma.company.findUnique({
                where: { id: ctx.companyId }
            });
            return { data: company };
        }
    );

    fastify.get(
        '/v1/companies/me/usage',
        {
            preHandler: fastify.requireCompanyRole([
                CompanyRole.OWNER,
                CompanyRole.ADMIN,
                CompanyRole.BILLING
            ])
        },
        async (request) => {
            const ctx = request.companyContext!;
            const now = new Date();

            const meters = await prisma.billingMeter.findMany({
                where: {
                    companyId: ctx.companyId,
                    periodStart: { lte: now },
                    periodEnd: { gte: now }
                }
            });

            return { data: meters };
        }
    );
}
