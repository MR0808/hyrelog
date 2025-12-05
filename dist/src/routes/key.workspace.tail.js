import { ApiKeyType } from '@prisma/client';
import { authenticateApiKey } from '@/lib/apiKeyAuth';
import { prisma } from '@/lib/prisma';
export const keyWorkspaceTailRoutes = async (app) => {
    app.get('/v1/key/workspace/events/tail', async (request, reply) => {
        const ctx = await authenticateApiKey(request, {
            allow: [ApiKeyType.WORKSPACE]
        });
        if (!ctx.workspace) {
            throw request.server.httpErrors.badRequest('Workspace key not linked to a workspace');
        }
        const workspace = ctx.workspace;
        // Check plan (Growth or above required)
        const companyPlan = await prisma.companyPlan.findUnique({
            where: { companyId: ctx.company.id },
            include: { plan: true }
        });
        if (!companyPlan) {
            throw request.server.httpErrors.forbidden('Plan upgrade required for event tailing');
        }
        const planCode = companyPlan.plan.code.toLowerCase();
        const allowedPlans = ['growth', 'scale', 'enterprise'];
        if (!allowedPlans.some((p) => planCode.includes(p))) {
            throw request.server.httpErrors.forbidden('Event tailing requires Growth plan or above');
        }
        // Set up SSE headers
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no' // Disable nginx buffering
        });
        let lastEventId = null;
        let isActive = true;
        // Send initial connection message
        reply.raw.write(`data: ${JSON.stringify({
            type: 'connected',
            workspaceId: workspace.id
        })}\n\n`);
        const pollInterval = setInterval(async () => {
            if (!isActive) {
                clearInterval(pollInterval);
                return;
            }
            try {
                const where = {
                    workspaceId: workspace.id,
                    archived: false
                };
                if (lastEventId) {
                    where.id = { gt: lastEventId };
                }
                const newEvents = await prisma.auditEvent.findMany({
                    where,
                    orderBy: { createdAt: 'asc' },
                    take: 100
                });
                for (const event of newEvents) {
                    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
                    lastEventId = event.id;
                }
            }
            catch (error) {
                reply.raw.write(`event: error\ndata: ${JSON.stringify({
                    error: String(error)
                })}\n\n`);
            }
        }, 1000); // Poll every second
        // Clean up on client disconnect
        request.raw.on('close', () => {
            isActive = false;
            clearInterval(pollInterval);
            reply.raw.end();
        });
    });
};
//# sourceMappingURL=key.workspace.tail.js.map