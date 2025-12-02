/**
 * Testing helpers and utilities
 */

import type { Event, EventInput, QueryResponse } from "../types";

/**
 * Asserts that an event matches expected structure
 */
export function assertEventStructure(event: Event | EventInput): void {
  if (!event.action || typeof event.action !== "string") {
    throw new Error("Event must have an 'action' field");
  }
  if (!event.category || typeof event.category !== "string") {
    throw new Error("Event must have a 'category' field");
  }
}

/**
 * Asserts that a query response is valid
 */
export function assertQueryResponse(response: QueryResponse): void {
  if (!response.data || !Array.isArray(response.data)) {
    throw new Error("Query response must have a 'data' array");
  }
  if (!response.pagination) {
    throw new Error("Query response must have 'pagination'");
  }
  if (typeof response.pagination.page !== "number") {
    throw new Error("Pagination must have a 'page' number");
  }
  if (typeof response.pagination.limit !== "number") {
    throw new Error("Pagination must have a 'limit' number");
  }
  if (typeof response.pagination.total !== "number") {
    throw new Error("Pagination must have a 'total' number");
  }
}

/**
 * Creates a diffable JSON representation for testing
 */
export function toDiffableJSON(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Compares two events (ignoring timestamps and IDs)
 */
export function eventsMatch(event1: EventInput, event2: EventInput): boolean {
  return (
    event1.action === event2.action &&
    event1.category === event2.category &&
    JSON.stringify(event1.payload) === JSON.stringify(event2.payload) &&
    JSON.stringify(event1.metadata) === JSON.stringify(event2.metadata)
  );
}

/**
 * Waits for a condition to be true (useful for async testing)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Creates a workspace key for testing
 */
export function createTestWorkspaceKey(): string {
  return `hlk_test_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Creates a company key for testing
 */
export function createTestCompanyKey(): string {
  return `hlk_test_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Mocks a delay (useful for testing retries)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock fetch response
 */
export function createMockResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers(headers),
    json: async () => data,
    text: async () => JSON.stringify(data),
    clone: function () {
      return this;
    },
  } as Response;
}

/**
 * Creates a mock fetch that returns specific responses
 */
export function createMockFetch(responses: Map<string, Response>): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const response = responses.get(url);
    if (response) {
      return response;
    }
    throw new Error(`No mock response for ${url}`);
  };
}

