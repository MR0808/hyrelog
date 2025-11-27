import { z } from 'zod';

export const CompanyInfoResponse = z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    eventsPerMonth: z.number(),
    exportsPerMonth: z.number(),
    retentionDays: z.number(),
    unlimitedRetention: z.boolean()
});
