/**
 * Mock client for testing
 */

import type { EventInput, Event, QueryOptions, QueryResponse } from "../types";
import { HyreLogWorkspaceClient } from "../client/workspace";
import { HyreLogCompanyClient } from "../client/company";

/**
 * In-memory event store for mock client
 */
class MockEventStore {
  private events: Event[] = [];
  private nextId = 1;

  add(event: EventInput): Event {
    const now = new Date().toISOString();
    const mockEvent: Event = {
      ...event,
      id: `mock-${this.nextId++}`,
      companyId: "mock-company",
      workspaceId: "mock-workspace",
      projectId: event.projectId || null,
      hash: `hash-${this.nextId}`,
      prevHash: this.events.length > 0 ? this.events[this.events.length - 1].hash : null,
      traceId: null,
      createdAt: now,
      archived: false,
    };
    this.events.push(mockEvent);
    return mockEvent;
  }

  query(options: QueryOptions): QueryResponse {
    let filtered = [...this.events];

    if (options.from) {
      const fromDate = new Date(options.from);
      filtered = filtered.filter((e) => new Date(e.createdAt) >= fromDate);
    }

    if (options.to) {
      const toDate = new Date(options.to);
      filtered = filtered.filter((e) => new Date(e.createdAt) <= toDate);
    }

    if (options.action) {
      filtered = filtered.filter((e) => e.action === options.action);
    }

    if (options.category) {
      filtered = filtered.filter((e) => e.category === options.category);
    }

    if (options.actorId) {
      filtered = filtered.filter((e) => e.actor?.id === options.actorId);
    }

    if (options.actorEmail) {
      filtered = filtered.filter((e) => e.actor?.email === options.actorEmail);
    }

    if (options.projectId) {
      filtered = filtered.filter((e) => e.projectId === options.projectId);
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }

  clear(): void {
    this.events = [];
    this.nextId = 1;
  }
}

/**
 * Create a mock workspace client for testing
 */
export function createMockClient(options?: {
  workspaceKey?: string;
  companyKey?: string;
}): {
  workspace: HyreLogWorkspaceClient;
  company: HyreLogCompanyClient;
  store: MockEventStore;
} {
  const store = new MockEventStore();

  // Override transport to use mock store
  const mockTransport = async (request: {
    method: string;
    url: string;
    body?: string;
  }): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }> => {
    if (request.method === "POST" && request.url.includes("/events")) {
      const body = request.body ? JSON.parse(request.body) : {};
      if (body.events && Array.isArray(body.events)) {
        // Batch
        const events = body.events.map((e: EventInput) => store.add(e));
        return {
          status: 200,
          headers: {},
          body: JSON.stringify({ events }),
        };
      } else {
        // Single event
        const event = store.add(body);
        return {
          status: 200,
          headers: {},
          body: JSON.stringify(event),
        };
      }
    }

    if (request.method === "GET" && request.url.includes("/events")) {
      const url = new URL(request.url, "http://localhost");
      const query: QueryOptions = {};
      if (url.searchParams.get("page")) query.page = parseInt(url.searchParams.get("page") || "1", 10);
      if (url.searchParams.get("limit")) query.limit = parseInt(url.searchParams.get("limit") || "20", 10);
      if (url.searchParams.get("from")) query.from = url.searchParams.get("from") || undefined;
      if (url.searchParams.get("to")) query.to = url.searchParams.get("to") || undefined;
      if (url.searchParams.get("action")) query.action = url.searchParams.get("action") || undefined;
      if (url.searchParams.get("category")) query.category = url.searchParams.get("category") || undefined;
      if (url.searchParams.get("actorId")) query.actorId = url.searchParams.get("actorId") || undefined;
      if (url.searchParams.get("actorEmail")) query.actorEmail = url.searchParams.get("actorEmail") || undefined;
      if (url.searchParams.get("projectId")) query.projectId = url.searchParams.get("projectId") || undefined;

      const result = store.query(query);
      return {
        status: 200,
        headers: {},
        body: JSON.stringify(result),
      };
    }

    return {
      status: 404,
      headers: {},
      body: JSON.stringify({ error: "Not found" }),
    };
  };

  const workspace = new HyreLogWorkspaceClient({
    workspaceKey: options?.workspaceKey || "mock-workspace-key",
    transport: mockTransport,
    baseUrl: "http://localhost",
  });

  const company = new HyreLogCompanyClient({
    companyKey: options?.companyKey || "mock-company-key",
    transport: mockTransport,
    baseUrl: "http://localhost",
  });

  return { workspace, company, store };
}

