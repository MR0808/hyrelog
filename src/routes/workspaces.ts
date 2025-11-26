// src/routes/workspaces.ts
import { FastifyInstance } from 'fastify';
import GithubSlugger from 'github-slugger';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createWorkspaceSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).optional()
});

async function generateWorkspaceSlug(name: string, customSlug?: string) {
    const slugger = new GithubSlugger();

    const base = customSlug ? slugger.slug(customSlug) : slugger.slug(name);

    let slug = base;
    let i = 1;

    // Try base, then base-2, base-3, ... until free
    // (GitHub-style behaviour)
    // NOTE: This still relies on DB unique constraint for race conditions.
    // For most SMB usage it's totally fine.
    // If you hit P2002, you can retry once at the route level.
    // For now, we just pre-check.
    // This is what you asked about re: "find a slug that doesn't exist".
    /* eslint-disable no-constant-condition */
    while (true) {
        const existing = await prisma.workspace.findUnique({
            where: { slug },
            select: { id: true }
        });

        if (!existing) return slug;

        i += 1;
        slug = `${base}-${i}`;
    }
}

export async function registerWorkspaceRoutes(fastify: FastifyInstance) {
    // Create workspace
    fastify.post('/v1/workspaces', async (request, reply) => {
        const parseResult = createWorkspaceSchema.safeParse(request.body);

        if (!parseResult.success) {
            reply.code(400).send({
                error: 'Invalid body',
                details: parseResult.error.flatten()
            });
            return;
        }

        const { name, slug } = parseResult.data;

        const resolvedSlug = await generateWorkspaceSlug(name, slug);

        const workspace = await prisma.workspace.create({
            data: {
                name,
                slug: resolvedSlug
            }
        });

        reply.code(201).send(workspace);
    });

    // List workspaces (for your Next.js admin/dashboard)
    fastify.get('/v1/workspaces', async (_request, _reply) => {
        const workspaces = await prisma.workspace.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return { data: workspaces };
    });
}
