import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { CompanyRole, WorkspaceRole } from '../../generated/prisma/client';

const addSchema = z.object({
    userId: z.string(),
    role: z.nativeEnum(WorkspaceRole)
});

export async function workspaceUserRoutes(fastify: FastifyInstance) {
    fastify.post(
        '/v1/workspaces/:workspaceId/users',
        {
            preHandler: fastify.requireCompanyRole([
                CompanyRole.OWNER,
                CompanyRole.ADMIN
            ])
        },
        async (request, reply) => {
            const workspaceId = (request.params as any).workspaceId;
            const parsed = addSchema.safeParse(request.body);
            if (!parsed.success) {
                reply.code(400).send({ error: parsed.error.flatten() });
                return;
            }

            const { userId, role } = parsed.data;

            const wu = await prisma.workspaceUser.create({
                data: {
                    workspaceId,
                    userId,
                    role
                }
            });

            reply.code(201).send(wu);
        }
    );
}
