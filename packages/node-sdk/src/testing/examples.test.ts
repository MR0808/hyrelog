/**
 * Example test file demonstrating testing utilities
 * This file can be used as a reference for writing tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMockClient, eventFactories, generateEventBatch } from "./index";

describe("HyreLog Testing Utilities", () => {
  const { workspace, company, store } = createMockClient();

  beforeEach(() => {
    store.clear();
  });

  describe("Mock Client", () => {
    it("should log events", async () => {
      const event = eventFactories.user.created({
        actor: { id: "user-1", email: "user@example.com" },
      });

      const result = await workspace.logEvent(event);

      expect(result.id).toBeDefined();
      expect(result.action).toBe("user.created");
      expect(store.count()).toBe(1);
    });

    it("should query events", async () => {
      await workspace.logEvent(eventFactories.user.created({ actor: { id: "user-1" } }));
      await workspace.logEvent(eventFactories.user.created({ actor: { id: "user-2" } }));

      const results = await workspace.queryEvents({ actorId: "user-1" });

      expect(results.data.length).toBe(1);
      expect(results.data[0]!.actor?.id).toBe("user-1");
    });

    it("should batch events", async () => {
      const events = generateEventBatch(5);
      const results = await workspace.logBatch(events);

      expect(results.length).toBe(5);
      expect(store.count()).toBe(5);
    });
  });

  describe("Event Factories", () => {
    it("should create user events", () => {
      const event = eventFactories.user.created();
      expect(event.action).toBe("user.created");
      expect(event.category).toBe("auth");
    });

    it("should create API events", () => {
      const event = eventFactories.api.request();
      expect(event.action).toBe("api.request");
      expect(event.category).toBe("api");
    });

    it("should create billing events", () => {
      const event = eventFactories.billing.subscriptionCreated();
      expect(event.action).toBe("billing.subscription.created");
      expect(event.category).toBe("billing");
    });
  });
});

