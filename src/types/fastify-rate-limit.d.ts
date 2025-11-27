// src/types/fastify-rate-limit.d.ts

import 'fastify';

declare module 'fastify' {
    interface FastifyContextConfig {
        rateLimit?: {
            max?: number;
            timeWindow?: string | number;
        };
    }

    interface FastifyRouteConfig {
        rateLimit?: {
            max?: number;
            timeWindow?: string | number;
        };
    }
}
