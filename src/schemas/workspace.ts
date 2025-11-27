import { z } from 'zod';

export const WorkspaceInfo = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string()
});
