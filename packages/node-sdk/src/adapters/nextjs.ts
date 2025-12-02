/**
 * Next.js middleware for HyreLog
 * Supports both App Router (middleware.ts) and Pages Router (middleware function)
 */

import type { NextRequest, NextResponse } from "next/server";
import { HyreLogWorkspaceClient } from "../client/workspace";
import type { HyreLogClientOptions } from "../types";
import { trace, context } from "@opentelemetry/api";

export interface HyreLogNextOptions {
  workspaceKey: string;
  clientOptions?: Omit<HyreLogClientOptions, "apiKey">;
  /**
   * Paths to exclude from logging
   * @default ["/api/health", "/_next", "/favicon.ico"]
   */
  excludePaths?: string[];
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
  getActor?: (req: NextRequest) => { id?: string; email?: string; name?: string } | null;
  /**
   * Function to extract project ID from request
   */
  getProjectId?: (req: NextRequest) => string | null;
}

/**
 * Create a Next.js middleware function for HyreLog
 */
export function hyrelogNextMiddleware(options: HyreLogNextOptions) {
  const client = new HyreLogWorkspaceClient({
    workspaceKey: options.workspaceKey,
    ...options.clientOptions,
  });

  const excludePaths = options.excludePaths || ["/api/health", "/_next", "/favicon.ico"];

  return async (req: NextRequest): Promise<NextResponse | void> => {
    const pathname = req.nextUrl.pathname;

    // Skip excluded paths
    if (excludePaths.some((path) => pathname.startsWith(path))) {
      return;
    }

    const startTime = Date.now();
    const tracer = trace.getTracer("hyrelog-nextjs");
    const span = tracer.startSpan(`http.${req.method}`, {
      attributes: {
        "http.method": req.method,
        "http.url": req.url,
        "http.route": pathname,
      },
    });

    try {
      // Create response
      const res = NextResponse.next();

      // Log after response is sent (in a non-blocking way)
      if (options.autoLog !== false) {
        // Use setTimeout to log after response is sent
        setTimeout(() => {
          const duration = Date.now() - startTime;
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
                pathname: pathname,
                durationMs: duration,
              },
              metadata: {
                userAgent: req.headers.get("user-agent") || undefined,
                ip: req.ip || req.headers.get("x-forwarded-for") || undefined,
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
                  pathname: pathname,
                  durationMs: duration,
                },
              })
              .catch((error) => {
                console.error("Failed to log slow request:", error);
              });
          }

          span.setStatus({ code: 1 });
          span.end();
        }, 0);
      } else {
        span.setStatus({ code: 1 });
        span.end();
      }

      return res;
    } catch (error) {
      if (options.logErrors !== false) {
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
              pathname: pathname,
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

/**
 * Next.js API route wrapper for automatic event logging
 * Use this in your API routes:
 * 
 * ```typescript
 * import { hyrelogApiWrapper } from "@hyrelog/node/adapters";
 * 
 * export default hyrelogApiWrapper({
 *   workspaceKey: process.env.HYRELOG_WORKSPACE_KEY!,
 * }, async (req, res) => {
 *   // Your API route handler
 *   res.json({ success: true });
 * });
 * ```
 */
export function hyrelogApiWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
  options: HyreLogNextOptions,
  handler: (req: NextRequest, res: NextResponse) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  const middleware = hyrelogNextMiddleware(options);

  return async (req: NextRequest): Promise<NextResponse> => {
    // Run middleware first
    const middlewareResult = await middleware(req);
    if (middlewareResult) {
      return middlewareResult as NextResponse;
    }

    // Then run handler
    const res = NextResponse.next();
    return handler(req, res);
  };
}

