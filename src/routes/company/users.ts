import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { CompanyRole } from '../../generated/prisma/client';

const inviteSchema = z.object({
    email: z.string().email(),
    role: z.nativeEnum(CompanyRole)
});

export async function companyUserRoutes(fastify: FastifyInstance) {
    fastify.post(
        '/v1/company-users',
        {
            preHandler: fastify.requireCompanyRole([
                CompanyRole.OWNER,
                CompanyRole.ADMIN
            ])
        },
        async (request, reply) => {
            const parsed = inviteSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400).send({ error: parsed.error.flatten() });
                return;
            }

            const ctx = request.companyContext!;
            const { email, role } = parsed.data;

            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                reply.code(404).send({ error: 'User not found' });
                return;
            }

            const cu = await prisma.companyUser.create({
                data: {
                    userId: user.id,
                    companyId: ctx.companyId,
                    role
                }
            });

            reply.code(201).send(cu);
        }
    );
}
