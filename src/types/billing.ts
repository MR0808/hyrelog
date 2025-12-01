import type { BillingMeter, UsageStats } from "@prisma/client";

export type BillingIncrementInput = {
  companyId: string;
  workspaceId?: string | null;
  amount?: number;
};

export type BillingCheckpoint = {
  meter: BillingMeter;
  usage: UsageStats;
  softLimitTriggered: boolean;
  hardLimitTriggered: boolean;
};

/**
 * Error raised when billing enforcement should reject an operation.
 */
export class BillingLimitError extends Error {
  constructor(
    message: string,
    public readonly checkpoint: BillingCheckpoint,
  ) {
    super(message);
    this.name = "BillingLimitError";
  }
}

