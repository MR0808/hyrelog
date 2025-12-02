/**
 * HyreLog Node.js/TypeScript SDK
 * 
 * Official SDK for ingesting and querying audit events in HyreLog.
 */

export { HyreLogWorkspaceClient } from "./client/workspace";
export { HyreLogCompanyClient } from "./client/company";
export type {
  HyreLogClientOptions,
  Event,
  EventInput,
  QueryOptions,
  QueryResponse,
  BatchOptions,
} from "./types";

export { createMockClient } from "./testing/mock";

// Re-export adapters
export * from "./adapters";

