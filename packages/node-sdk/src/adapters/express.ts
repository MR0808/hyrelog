/**
 * Express.js middleware for HyreLog
 */

import type { Request, Response, NextFunction } from "express";
import { HyreLogWorkspaceClient } from "../client/workspace";
import type { HyreLogClientOptions } from "../types";
import { trace, context } from "@opentelemetry/api";

export interface HyreLogExpressOptions {
  workspaceKey: string;
  clientOptions?: Omit<HyreLogClientOptions, "apiKey">;
  /**
   * Whether to automatically log requests
   * @default true
   */
  autoLog?: boolean;
  /**
   * Whether to log errors
   * @default true
   */
  logErrors?: boolean;
  /**
   * Whether to log slow requests
   * @default true
   */
  logSlowRequests?: boolean;
  /**
   * Threshold for slow requests in milliseconds
   * @default 1000
   */
  slowRequestThreshold?: number;
  /**
   * Function to extract actor information from request
   */
  getActor?: (req: Request) => { id?: string; email?: string; name?: string } | null;
  /**
   * Function to extract project ID from request
   */
  getProjectId?: (req: Request) => string | null;
}

/**
 * Express middleware for automatic event logging
 */
export function hyrelogMiddleware(options: HyreLogExpressOptions) {
  const client = new HyreLogWorkspaceClient({
    workspaceKey: options.workspaceKey,
    ...options.clientOptions,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const tracer = trace.getTracer("hyrelog-express");
    const span = tracer.startSpan(`http.${req.method}`, {
      attributes: {
        "http.method": req.method,
        "http.url": req.url,
        "http.route": req.route?.path || req.path,
      },
    });

    // Attach client to request for manual logging
    (req as { hyrelog?: HyreLogWorkspaceClient }).hyrelog = client;

    // Capture response
    const originalSend = res.send.bind(res);
    res.send = function (body: unknown) {
      const duration = Date.now() - startTime;
      span.setAttribute("http.status_code", res.statusCode);
      span.setAttribute("http.duration_ms", duration);

      if (options.autoLog !== false) {
        const actor = options.getActor?.(req) || null;
        const projectId = options.getProjectId?.(req) || null;

        void client
          .logEvent({
            action: `http.${req.method.toLowerCase()}`,
            category: "http",
            actor: actor || undefined,
            projectId: projectId || undefined,
            payload: {
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
              durationMs: duration,
            },
            metadata: {
              userAgent: req.headers["user-agent"],
              ip: req.ip,
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
                method: req.method,
                url: req.url,
                durationMs: duration,
              },
            })
            .catch((error) => {
              console.error("Failed to log slow request:", error);
            });
        }
      }

      span.end();
      return originalSend(body);
    };

    // Error handling
    if (options.logErrors !== false) {
      const originalErrorHandler = req.on.bind(req);
      req.on = function (event: string, handler: (...args: unknown[]) => void) {
        if (event === "error") {
          return originalErrorHandler(event, (error: Error) => {
            const actor = options.getActor?.(req) || null;
            const projectId = options.getProjectId?.(req) || null;

            void client
              .logEvent({
                action: "http.error",
                category: "error",
                actor: actor || undefined,
                projectId: projectId || undefined,
                payload: {
                  method: req.method,
                  url: req.url,
                  error: error.message,
                  stack: error.stack,
                },
              })
              .catch((err) => {
                console.error("Failed to log error event:", err);
              });

            span.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            handler(error);
          });
        }
        return originalErrorHandler(event, handler);
      };
    }

    // Propagate OpenTelemetry context
    context.with(trace.setSpan(context.active(), span), () => {
      next();
    });
  };
}

