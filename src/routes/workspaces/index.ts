import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { CompanyRole } from '../../generated/prisma/client';

const createWorkspaceSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1)
});

export async function workspaceRoutes(fastify: FastifyInstance) {
    fastify.post(
        '/v1/workspaces',
        {
            preHandler: [
                fastify.requireCompanyRole([
                    CompanyRole.OWNER,
                    CompanyRole.ADMIN
                ]),
                fastify.enforceMeter('WORKSPACES')
            ]
        },
        async (request, reply) => {
            const parsed = createWorkspaceSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400).send({ error: parsed.error.flatten() });
                return;
            }

            const ctx = request.companyContext!;
            const { name, slug } = parsed.data;

            const workspace = await prisma.workspace.create({
                data: {
                    name,
                    slug,
                    companyId: ctx.companyId
                }
            });

            reply.code(201).send(workspace);
        }
    );

    fastify.get(
        '/v1/workspaces',
        {
            preHandler: fastify.requireCompanyRole([
                CompanyRole.OWNER,
                CompanyRole.ADMIN,
                CompanyRole.MEMBER
            ])
        },
        async (request) => {
            const ctx = request.companyContext!;
            const workspaces = await prisma.workspace.findMany({
                where: { companyId: ctx.companyId },
                orderBy: { createdAt: 'desc' }
            });

            return { data: workspaces };
        }
    );
}
