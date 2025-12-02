/**
 * Koa middleware for HyreLog
 */

import type { Context, Next, Middleware } from "koa";
import { HyreLogWorkspaceClient } from "../client/workspace";
import type { HyreLogClientOptions } from "../types";
import { trace, context } from "@opentelemetry/api";

export interface HyreLogKoaOptions {
  workspaceKey: string;
  clientOptions?: Omit<HyreLogClientOptions, "apiKey">;
  autoLog?: boolean;
  logErrors?: boolean;
  logSlowRequests?: boolean;
  slowRequestThreshold?: number;
  getActor?: (ctx: Context) => { id?: string; email?: string; name?: string } | null;
  getProjectId?: (ctx: Context) => string | null;
}

/**
 * Koa middleware for automatic event logging
 */
export function hyrelogKoaMiddleware(options: HyreLogKoaOptions): Middleware {
  const client = new HyreLogWorkspaceClient({
    workspaceKey: options.workspaceKey,
    ...options.clientOptions,
  });

  return async (ctx: Context, next: Next) => {
    const startTime = Date.now();
    const tracer = trace.getTracer("hyrelog-koa");
    const span = tracer.startSpan(`http.${ctx.method}`, {
      attributes: {
        "http.method": ctx.method,
        "http.url": ctx.url,
        "http.route": ctx._matchedRoute || ctx.path,
      },
    });

    // Attach client to context
    ctx.hyrelog = client;

    try {
      // Propagate OpenTelemetry context
      await context.with(trace.setSpan(context.active(), span), async () => {
        await next();
      });

      const duration = Date.now() - startTime;
      span.setAttribute("http.status_code", ctx.status);
      span.setAttribute("http.duration_ms", duration);

      if (options.autoLog !== false) {
        const actor = options.getActor?.(ctx) || null;
        const projectId = options.getProjectId?.(ctx) || null;

        void client
          .logEvent({
            action: `http.${ctx.method.toLowerCase()}`,
            category: "http",
            actor: actor || undefined,
            projectId: projectId || undefined,
            payload: {
              method: ctx.method,
              url: ctx.url,
              statusCode: ctx.status,
              durationMs: duration,
            },
            metadata: {
              userAgent: ctx.headers["user-agent"],
              ip: ctx.ip,
            },
          })
          .catch((error) => {
            console.error("Failed to log event:", error);
          });

        if (options.logSlowRequests !== false && duration > (options.slowRequestThreshold || 1000)) {
          void client
            .logEvent({
              action: "http.slow_request",
              category: "performance",
              actor: actor || undefined,
              projectId: projectId || undefined,
              payload: {
                method: ctx.method,
                url: ctx.url,
                durationMs: duration,
              },
            })
            .catch((error) => {
              console.error("Failed to log slow request:", error);
            });
        }
      }

      span.setStatus({ code: 1 }); // OK
      span.end();
    } catch (error) {
      const duration = Date.now() - startTime;
      span.setAttribute("http.status_code", ctx.status || 500);
      span.setAttribute("http.duration_ms", duration);

      if (options.logErrors !== false) {
        const actor = options.getActor?.(ctx) || null;
        const projectId = options.getProjectId?.(ctx) || null;

        void client
          .logEvent({
            action: "http.error",
            category: "error",
            actor: actor || undefined,
            projectId: projectId || undefined,
            payload: {
              method: ctx.method,
              url: ctx.url,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
          })
          .catch((err) => {
            console.error("Failed to log error event:", err);
          });

        span.recordException(error instanceof Error ? error : new Error(String(error)));
        span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      }

      span.end();
      throw error;
    }
  };
}

// Type augmentation for Koa context
declare module "koa" {
  interface BaseContext {
    hyrelog: HyreLogWorkspaceClient;
  }
}

