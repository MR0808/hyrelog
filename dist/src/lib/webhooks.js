import { prisma } from "@/lib/prisma";
import { WebhookDeliveryStatus } from "@prisma/client";
/**
 * Creates webhook delivery records for an event.
 */
export const createWebhookDeliveries = async (input) => {
    // Find matching webhooks: company-level (no workspaceId) or workspace-level
    const webhooks = await prisma.webhook.findMany({
        where: {
            companyId: input.companyId,
            isActive: true,
            OR: [
                { workspaceId: null }, // Company-wide
                { workspaceId: input.workspaceId }, // Workspace-specific
            ],
        },
    });
    if (webhooks.length === 0) {
        return;
    }
    // Create delivery records
    await prisma.webhookDelivery.createMany({
        data: webhooks.map((webhook) => ({
            webhookId: webhook.id,
            eventId: input.eventId,
            status: WebhookDeliveryStatus.PENDING,
            nextAttemptAt: new Date(), // Immediate attempt
        })),
    });
};
//# sourceMappingURL=webhooks.js.map