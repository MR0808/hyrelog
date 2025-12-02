/**
 * Event factories for generating test events
 */

import type { EventInput } from "../types";

export interface EventFactoryOptions {
  action?: string;
  category?: string;
  actorId?: string;
  actorEmail?: string;
  actorName?: string;
  targetId?: string;
  targetType?: string;
  payload?: Record<string, any>;
  metadata?: Record<string, any>;
  projectId?: string;
}

/**
 * Creates a factory function for generating events
 */
export function createEventFactory(defaults?: EventFactoryOptions) {
  return (overrides?: EventFactoryOptions): EventInput => {
    const action = overrides?.action ?? defaults?.action ?? "test.action";
    const category = overrides?.category ?? defaults?.category ?? "test";

    return {
      action,
      category,
      actor: overrides?.actorId || defaults?.actorId || overrides?.actorEmail || defaults?.actorEmail
        ? {
            id: overrides?.actorId ?? defaults?.actorId ?? `user-${Math.random().toString(36).substring(7)}`,
            email: overrides?.actorEmail ?? defaults?.actorEmail ?? `user-${Math.random().toString(36).substring(7)}@example.com`,
            name: overrides?.actorName ?? defaults?.actorName ?? "Test User",
          }
        : undefined,
      target: overrides?.targetId || defaults?.targetId
        ? {
            id: overrides?.targetId ?? defaults?.targetId ?? `target-${Math.random().toString(36).substring(7)}`,
            type: overrides?.targetType ?? defaults?.targetType ?? "resource",
          }
        : undefined,
      payload: {
        ...defaults?.payload,
        ...overrides?.payload,
      },
      metadata: {
        ...defaults?.metadata,
        ...overrides?.metadata,
        _test: true,
        _generatedAt: new Date().toISOString(),
      },
      projectId: overrides?.projectId ?? defaults?.projectId,
    };
  };
}

/**
 * Pre-configured event factories for common event types
 */
export const eventFactories = {
  /**
   * User-related events
   */
  user: {
    created: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "user.created", category: "auth" })(overrides),
    updated: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "user.updated", category: "auth" })(overrides),
    deleted: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "user.deleted", category: "auth" })(overrides),
    login: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "user.login", category: "auth" })(overrides),
    logout: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "user.logout", category: "auth" })(overrides),
  },

  /**
   * API-related events
   */
  api: {
    request: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "api.request", category: "api" })(overrides),
    response: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "api.response", category: "api" })(overrides),
    error: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "api.error", category: "error" })(overrides),
  },

  /**
   * Billing events
   */
  billing: {
    subscriptionCreated: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "billing.subscription.created", category: "billing" })(overrides),
    subscriptionUpdated: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "billing.subscription.updated", category: "billing" })(overrides),
    paymentSucceeded: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "billing.payment.succeeded", category: "billing" })(overrides),
    paymentFailed: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "billing.payment.failed", category: "billing" })(overrides),
  },

  /**
   * System events
   */
  system: {
    pipelineError: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "system.pipeline.error", category: "system" })(overrides),
    jobCompleted: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "system.job.completed", category: "system" })(overrides),
    jobFailed: (overrides?: EventFactoryOptions) =>
      createEventFactory({ action: "system.job.failed", category: "system" })(overrides),
  },
};

/**
 * Generates a batch of events
 */
export function generateEventBatch(count: number, factory?: (index: number) => EventInput): EventInput[] {
  const defaultFactory = createEventFactory();
  return Array.from({ length: count }, (_, i) => (factory ? factory(i) : defaultFactory({ action: `test.action.${i}` })));
}

/**
 * Generates events with changes tracking
 */
export function eventWithChanges(field: string, oldValue: any, newValue: any, overrides?: EventFactoryOptions): EventInput {
  return createEventFactory(overrides)({
    ...overrides,
    changes: [
      {
        field,
        old: oldValue,
        new: newValue,
      },
    ],
  });
}

