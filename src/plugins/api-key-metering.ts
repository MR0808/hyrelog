// src/plugins/api-key-metering.ts
import fp from 'fastify-plugin';
import { incrementCompanyMeter } from '../metering/company/increment';
import { incrementWorkspaceMeter } from '../metering/workspace/increment';
import { MeterType } from '../generated/prisma/client';

const apiKeyMetering = fp(async (fastify) => {
    fastify.addHook('onSend', async (request, reply, payload) => {
        const auth = request.auth;
        if (!auth) return;

        const { companyId, workspaceId } = auth;

        // Company-level metering for API requests
        await incrementCompanyMeter(companyId, MeterType.USERS, 1);

        // Workspace-specific metering
        if (workspaceId) {
            await incrementWorkspaceMeter(
                companyId,
                workspaceId,
                MeterType.USERS,
                1
            );
        }
    });
});

export default apiKeyMetering;
