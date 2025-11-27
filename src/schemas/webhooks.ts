// src/schemas/webhook.ts
import { z } from 'zod';

export const UpdateWebhookSchema = z.object({
    url: z.url(),
    secret: z.string().min(16)
});

export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;
