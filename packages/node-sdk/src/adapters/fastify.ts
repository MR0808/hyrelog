/**
 * Fastify plugin for HyreLog
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { HyreLogWorkspaceClient } from "../client/workspace";
import type { HyreLogClientOptions } from "../types";
import { trace, context } from "@opentelemetry/api";

export interface HyreLogFastifyOptions {
  workspaceKey: string;
  clientOptions?: Omit<HyreLogClientOptions, "apiKey">;
  autoLog?: boolean;
  logErrors?: boolean;
  logSlowRequests?: boolean;
  slowRequestThreshold?: number;
  getActor?: (req: FastifyRequest) => { id?: string; email?: string; name?: string } | null;
  getProjectId?: (req: FastifyRequest) => string | null;
}

/**
 * Fastify plugin for automatic event logging
 */
export const hyrelogFastifyPlugin: FastifyPluginAsync<HyreLogFastifyOptions> = async (app, options) => {
  const client = new HyreLogWorkspaceClient({
    workspaceKey: options.workspaceKey,
    ...options.clientOptions,
  });

  // Attach client to Fastify instance
  app.decorate("hyrelog", client);

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    const tracer = trace.getTracer("hyrelog-fastify");
    const span = tracer.startSpan(`http.${request.method}`, {
      attributes: {
        "http.method": request.method,
        "http.url": request.url,
        "http.route": request.routerPath || request.url,
      },
    });

    // Attach client to request
    (request as { hyrelog?: HyreLogWorkspaceClient }).hyrelog = client;

    // Capture response
    reply.addHook("onSend", async (request: FastifyRequest, reply: FastifyReply) => {
      const duration = Date.now() - startTime;
      span.setAttribute("http.status_code", reply.statusCode);
      span.setAttribute("http.duration_ms", duration);

      if (options.autoLog !== false) {
        const actor = options.getActor?.(request) || null;
        const projectId = options.getProjectId?.(request) || null;

        void client
          .logEvent({
            action: `http.${request.method.toLowerCase()}`,
            category: "http",
            actor: actor || undefined,
            projectId: projectId || undefined,
            payload: {
              method: request.method,
              url: request.url,
              statusCode: reply.statusCode,
              durationMs: duration,
            },
            metadata: {
              userAgent: request.headers["user-agent"],
              ip: request.ip,
            },
          })
          .catch((error) => {
            app.log.error(error, "Failed to log event");
          });

        if (options.logSlowRequests !== false && duration > (options.slowRequestThreshold || 1000)) {
          void client
            .logEvent({
              action: "http.slow_request",
              category: "performance",
              actor: actor || undefined,
              projectId: projectId || undefined,
              payload: {
                method: request.method,
                url: request.url,
                durationMs: duration,
              },
            })
            .catch((error) => {
              app.log.error(error, "Failed to log slow request");
            });
        }
      }

      span.end();
    });

    // Error handling
    if (options.logErrors !== false) {
      reply.addHook("onError", async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
        const actor = options.getActor?.(request) || null;
        const projectId = options.getProjectId?.(request) || null;

        void client
          .logEvent({
            action: "http.error",
            category: "error",
            actor: actor || undefined,
            projectId: projectId || undefined,
            payload: {
              method: request.method,
              url: request.url,
              error: error.message,
              stack: error.stack,
            },
          })
          .catch((err) => {
            app.log.error(err, "Failed to log error event");
          });

        span.recordException(error);
        span.setStatus({ code: 2, message: error.message });
      });
    }

    // Propagate OpenTelemetry context
    context.with(trace.setSpan(context.active(), span), () => {
      // Continue
    });
  });
};

// Type augmentation for Fastify instance
declare module "fastify" {
  interface FastifyInstance {
    hyrelog: HyreLogWorkspaceClient;
  }
}

