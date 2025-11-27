// src/routes/security.ts
import { FastifyInstance } from 'fastify';
import {
    detectSuspiciousActivityForCompany,
    SuspiciousActivityAlert
} from '../lib/security/suspiciousActivity';

export default async function securityRoutes(fastify: FastifyInstance) {
    fastify.get<{
        Querystring: {
            windowMs?: string | number;
        };
    }>(
        '/v1/company/suspicious-activity',
        {
            schema: {
                querystring: {
                    type: 'object',
                    properties: {
                        windowMs: { type: ['string', 'number'] }
                    },
                    additionalProperties: true
                }
            },
            config: {
                rateLimit: {
                    max: 20,
                    timeWindow: '1 minute'
                }
            }
        },
        async (request, reply) => {
            const api = request.auth;
            if (!api)
                return reply.status(401).send({ error: 'UNAUTHENTICATED' });

            if (api.scope !== 'COMPANY') {
                return reply
                    .status(403)
                    .send({ error: 'WORKSPACE_KEY_FORBIDDEN' });
            }

            const windowMs =
                request.query.windowMs !== undefined
                    ? Number(request.query.windowMs)
                    : undefined;

            const alerts: SuspiciousActivityAlert[] =
                await detectSuspiciousActivityForCompany(api.companyId, {
                    windowMs
                });

            return reply.send({ data: alerts });
        }
    );
}
