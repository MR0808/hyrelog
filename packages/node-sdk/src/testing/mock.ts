/**
 * Mock client for testing
 * Provides an in-memory implementation of HyreLog clients
 */

import type {
  HyreLogWorkspaceClient,
  HyreLogCompanyClient,
  EventInput,
  Event,
  QueryOptions,
  QueryResponse,
} from "../types";
import { HyreLogWorkspaceClient as WorkspaceClient } from "../client/workspace";
import { HyreLogCompanyClient as CompanyClient } from "../client/company";

export interface MockEventStore {
  events: Event[];
  add(event: EventInput): Event;
  query(options: QueryOptions): QueryResponse;
  clear(): void;
  getById(id: string): Event | undefined;
  count(): number;
}

/**
 * In-memory event store for mock client
 */
class InMemoryEventStore implements MockEventStore {
  events: Event[] = [];
  private nextId = 1;

  add(event: EventInput): Event {
    const mockEvent: Event = {
      id: `mock-${this.nextId++}`,
      companyId: "mock-company",
      workspaceId: event.projectId ? `mock-workspace-${event.projectId}` : "mock-workspace",
      projectId: event.projectId ?? null,
      hash: `hash-${this.nextId}`,
      prevHash: this.events.length > 0 ? this.events[this.events.length - 1]!.hash : null,
      traceId: null,
      createdAt: new Date().toISOString(),
      archived: false,
      dataRegion: "AU",
      ...event,
    };
    this.events.push(mockEvent);
    return mockEvent;
  }

  query(options: QueryOptions): QueryResponse {
    let filtered = [...this.events];

    // Filter by date range
    if (options.from) {
      const fromDate = typeof options.from === "string" ? new Date(options.from) : options.from;
      filtered = filtered.filter((e) => new Date(e.createdAt) >= fromDate);
    }
    if (options.to) {
      const toDate = typeof options.to === "string" ? new Date(options.to) : options.to;
      filtered = filtered.filter((e) => new Date(e.createdAt) <= toDate);
    }

    // Filter by action
    if (options.action) {
      filtered = filtered.filter((e) => e.action === options.action);
    }

    // Filter by category
    if (options.category) {
      filtered = filtered.filter((e) => e.category === options.category);
    }

    // Filter by actor
    if (options.actorId) {
      filtered = filtered.filter((e) => e.actor?.id === options.actorId);
    }
    if (options.actorEmail) {
      filtered = filtered.filter((e) => e.actor?.email === options.actorEmail);
    }

    // Filter by project
    if (options.projectId) {
      filtered = filtered.filter((e) => e.projectId === options.projectId);
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
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

  getById(id: string): Event | undefined {
    return this.events.find((e) => e.id === id);
  }

  count(): number {
    return this.events.length;
  }
}

/**
 * Mock workspace client
 */
class MockWorkspaceClient extends WorkspaceClient {
  constructor(private store: MockEventStore, workspaceKey: string) {
    super({ workspaceKey, baseUrl: "http://localhost" });
  }

  async logEvent(event: EventInput): Promise<Event> {
    return this.store.add(event);
  }

  async logBatch(events: EventInput[]): Promise<Event[]> {
    return events.map((e) => this.store.add(e));
  }

  async queryEvents(options?: QueryOptions): Promise<QueryResponse> {
    return this.store.query(options ?? {});
  }
}

/**
 * Mock company client
 */
class MockCompanyClient extends CompanyClient {
  constructor(private store: MockEventStore, companyKey: string) {
    super({ companyKey, baseUrl: "http://localhost" });
  }

  async queryEvents(options?: QueryOptions): Promise<QueryResponse> {
    return this.store.query(options ?? {});
  }

  async queryGlobalEvents(options?: QueryOptions): Promise<QueryResponse> {
    // For mock, global is same as regular query
    return this.store.query(options ?? {});
  }
}

export interface MockClientResult {
  workspace: HyreLogWorkspaceClient;
  company: HyreLogCompanyClient;
  store: MockEventStore;
}

/**
 * Creates a mock client for testing
 */
export function createMockClient(
  workspaceKey?: string,
  companyKey?: string,
): MockClientResult {
  const store = new InMemoryEventStore();
  const wsKey = workspaceKey ?? "mock-workspace-key";
  const compKey = companyKey ?? "mock-company-key";

  return {
    workspace: new MockWorkspaceClient(store, wsKey) as any,
    company: new MockCompanyClient(store, compKey) as any,
    store,
  };
}

/**
 * Creates a snapshot of events for testing
 */
export function createEventSnapshot(events: Event[]): string {
  return JSON.stringify(
    events.map((e) => ({
      action: e.action,
      category: e.category,
      actor: e.actor,
      payload: e.payload,
      metadata: e.metadata,
    })),
    null,
    2,
  );
}

/**
 * Compares event snapshots
 */
export function compareSnapshots(snapshot1: string, snapshot2: string): boolean {
  return snapshot1 === snapshot2;
}
