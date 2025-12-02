/**
 * Company-level client for read-only operations
 */

import { BaseClient } from "./base";
import type { Event, QueryOptions, QueryResponse, HyreLogClientOptions } from "../types";
import { trace } from "@opentelemetry/api";

/**
 * Company client for querying events across workspaces
 */
export class HyreLogCompanyClient extends BaseClient {
  constructor(options: { companyKey: string } & Omit<HyreLogClientOptions, "apiKey">) {
    super({ ...options, apiKey: options.companyKey });
  }

  /**
   * Query events across all workspaces in the company
   */
  async queryEvents(options: QueryOptions = {}): Promise<QueryResponse> {
    const tracer = trace.getTracer("hyrelog-sdk");
    const span = tracer.startSpan("hyrelog.queryCompanyEvents");

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
      if (options.workspaceId) params.set("workspaceId", options.workspaceId);
      if (options.projectId) params.set("projectId", options.projectId);

      const queryString = params.toString();
      const path = `/v1/key/company/events${queryString ? `?${queryString}` : ""}`;

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
   * Query events globally across all regions (Phase 3 feature)
   */
  async queryGlobalEvents(options: QueryOptions = {}): Promise<QueryResponse> {
    const tracer = trace.getTracer("hyrelog-sdk");
    const span = tracer.startSpan("hyrelog.queryGlobalEvents");

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
      if (options.workspaceId) params.set("workspaceId", options.workspaceId);
      if (options.projectId) params.set("projectId", options.projectId);

      const queryString = params.toString();
      const path = `/v1/key/company/events/global${queryString ? `?${queryString}` : ""}`;

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
   * Get company region information
   */
  async getRegions(): Promise<{
    company: {
      id: string;
      name: string;
      primaryRegion: string;
      replicaRegions: string[];
    };
    regions: Array<{
      region: string;
      isPrimary: boolean;
      isReplica: boolean;
      dbUrl: string;
      readOnlyUrl: string;
      coldStorageProvider: string;
      coldStorageBucket: string;
      health: string;
    }>;
  }> {
    const tracer = trace.getTracer("hyrelog-sdk");
    const span = tracer.startSpan("hyrelog.getRegions");

    try {
      const result = await this.request<{
        company: {
          id: string;
          name: string;
          primaryRegion: string;
          replicaRegions: string[];
        };
        regions: Array<{
          region: string;
          isPrimary: boolean;
          isReplica: boolean;
          dbUrl: string;
          readOnlyUrl: string;
          coldStorageProvider: string;
          coldStorageBucket: string;
          health: string;
        }>;
      }>("GET", "/v1/key/company/regions");

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
}

