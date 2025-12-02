/**
 * Jest-specific testing utilities
 */

import type { Event, EventInput } from "../types";
import { createMockClient, type MockEventStore } from "./mock";
import { eventFactories, generateEventBatch } from "./factories";
import { assertEventStructure, assertQueryResponse, toDiffableJSON } from "./helpers";

/**
 * Jest matchers for HyreLog events
 */
export const jestMatchers = {
  toBeValidEvent(received: Event | EventInput) {
    try {
      assertEventStructure(received);
      return {
        message: () => `Expected event to be valid`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `Expected event to be valid, but got error: ${error instanceof Error ? error.message : String(error)}`,
        pass: false,
      };
    }
  },
};

/**
 * Setup function for Jest tests
 */
export function setupHyreLogTests() {
  const { workspace, company, store } = createMockClient();

  beforeEach(() => {
    store.clear();
  });

  return {
    workspace,
    company,
    store,
    factories: eventFactories,
    generateBatch: generateEventBatch,
  };
}

/**
 * Creates a test suite helper
 */
export function createTestSuite() {
  const mock = createMockClient();

  return {
    ...mock,
    factories: eventFactories,
    helpers: {
      assertEventStructure,
      assertQueryResponse,
      toDiffableJSON,
    },
  };
}

