// src/utils/slug.ts
import Slugger from 'github-slugger';
import { prisma } from '../lib/prisma';

const slugger = new Slugger();

export async function generateUniqueWorkspaceSlug(
    name: string,
    requestedSlug?: string
): Promise<string> {
    slugger.reset();

    const baseInput =
        requestedSlug && requestedSlug.trim().length > 0 ? requestedSlug : name;

    let base = slugger.slug(baseInput);
    if (!base) base = 'workspace';

    let slug = base;
    let counter = 2;

    // Loop until we find an unused slug
    // (industry-standard pattern: my-team, my-team-2, my-team-3, ...)
    // This avoids the P2002 unique constraint error you saw.
    while (true) {
        const existing = await prisma.workspace.findUnique({
            where: { slug }
        });

        if (!existing) {
            return slug;
        }

        slug = `${base}-${counter}`;
        counter++;
    }
}
