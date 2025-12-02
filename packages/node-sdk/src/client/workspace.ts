/**
 * Workspace-level client for event ingestion and querying
 */

import { BaseClient } from "./base";
import type { EventInput, Event, QueryOptions, QueryResponse, BatchOptions, HyreLogClientOptions } from "../types";
import { trace } from "@opentelemetry/api";

/**
 * Workspace client for ingesting and querying events
 */
export class HyreLogWorkspaceClient extends BaseClient {
  private batchQueue: EventInput[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchOptions: Required<BatchOptions>;

  constructor(options: { workspaceKey: string; batch?: BatchOptions } & Omit<HyreLogClientOptions, "apiKey">) {
    super({ ...options, apiKey: options.workspaceKey });
    this.batchOptions = {
      maxSize: options.batch?.maxSize || 100,
      maxWait: options.batch?.maxWait || 5000,
      autoFlush: options.batch?.autoFlush || false,
    };

    if (this.batchOptions.autoFlush) {
      this.startBatchTimer();
    }
  }

  /**
   * Log a single event
   */
  async logEvent(event: EventInput): Promise<Event> {
    const tracer = trace.getTracer("hyrelog-sdk");
    const span = tracer.startSpan("hyrelog.logEvent", {
      attributes: {
        "event.action": event.action,
        "event.category": event.category,
      },
    });

    try {
      const result = await this.request<Event>("POST", "/v1/key/workspace/events", {
        body: event,
      });

      span.setStatus({ code: 1 }); // OK
      span.end();
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) }); // ERROR
      span.end();
      throw error;
    }
  }

  /**
   * Log multiple events in a batch
   */
  async logBatch(events: EventInput[]): Promise<Event[]> {
    if (events.length === 0) {
      return [];
    }

    const tracer = trace.getTracer("hyrelog-sdk");
    const span = tracer.startSpan("hyrelog.logBatch", {
      attributes: {
        "batch.size": events.length,
      },
    });

    try {
      // Split into chunks if batch is too large
      const chunks: EventInput[][] = [];
      for (let i = 0; i < events.length; i += this.batchOptions.maxSize) {
        chunks.push(events.slice(i, i + this.batchOptions.maxSize));
      }

      const results: Event[] = [];
      for (const chunk of chunks) {
        const result = await this.request<{ events: Event[] }>("POST", "/v1/key/workspace/events/batch", {
          body: { events: chunk },
        });
        results.push(...result.events);
      }

      span.setStatus({ code: 1 });
      span.end();
      return results;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      span.end();
      throw error;
    }
  }

  /**
   * Queue an event for batch ingestion (if autoFlush is enabled)
   */
  queueEvent(event: EventInput): void {
    this.batchQueue.push(event);

    if (this.batchQueue.length >= this.batchOptions.maxSize) {
      this.flushBatch();
    } else if (this.batchOptions.autoFlush && !this.batchTimer) {
      this.startBatchTimer();
    }
  }

  /**
   * Flush queued events
   */
  async flushBatch(): Promise<Event[]> {
    if (this.batchQueue.length === 0) {
      return [];
    }

    const events = [...this.batchQueue];
    this.batchQueue = [];
    this.clearBatchTimer();

    return this.logBatch(events);
  }

  /**
   * Query events for this workspace
   */
  async queryEvents(options: QueryOptions = {}): Promise<QueryResponse> {
    const tracer = trace.getTracer("hyrelog-sdk");
    const span = tracer.startSpan("hyrelog.queryEvents");

    try {
      const params = new URLSearchParams();
      if (options.page) params.set("page", options.page.toString());
      if (options.limit) params.set("limit", options.limit.toString());
      if (options.from) params.set("from", options.from);
      if (options.to) params.set("to", options.to);
      if (options.action) params.set("action", options.action);
      if (options.category) params.set("category", options.category);
      if (options.actorId) params.set("actorId", options.actorId);
      if (options.actorEmail) params.set("actorEmail", options.actorEmail);
      if (options.projectId) params.set("projectId", options.projectId);

      const queryString = params.toString();
      const path = `/v1/key/workspace/events${queryString ? `?${queryString}` : ""}`;

      const result = await this.request<QueryResponse>("GET", path);

      span.setStatus({ code: 1 });
      span.end();
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
      span.end();
      throw error;
    }
  }

  /**
   * Start batch timer for auto-flush
   */
  private startBatchTimer(): void {
    this.clearBatchTimer();
    this.batchTimer = setTimeout(() => {
      void this.flushBatch();
    }, this.batchOptions.maxWait);
  }

  /**
   * Clear batch timer
   */
  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    this.clearBatchTimer();
    if (this.batchQueue.length > 0) {
      await this.flushBatch();
    }
  }
}

