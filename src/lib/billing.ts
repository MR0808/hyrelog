import { BillingMeterType, type Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { BillingCheckpoint, BillingIncrementInput } from "@/types/billing";
import { BillingLimitError } from "@/types/billing";

const EVENTS_METER = BillingMeterType.EVENTS;

const meterWhere = (companyId: string, now: Date) => ({
  companyId,
  meterType: EVENTS_METER,
  periodStart: {
    lte: now,
  },
  periodEnd: {
    gt: now,
  },
});

/**
 * Increments the event ingestion meter and enforces plan limits.
 */
export const incrementEventUsage = async (input: BillingIncrementInput): Promise<BillingCheckpoint> => {
  if (!input.workspaceId) {
    throw new Error("workspaceId is required for billing enforcement");
  }
  const amount = input.amount ?? 1;
  const now = new Date();
  const workspaceId = input.workspaceId;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const activeMeter = await tx.billingMeter.findFirst({
      where: meterWhere(input.companyId, now),
      orderBy: { periodEnd: "desc" },
    });

    if (!activeMeter) {
      throw new Error("Active billing meter not configured");
    }

    const projectedValue = activeMeter.currentValue + amount;
    const { softLimit, hardLimit } = await loadThresholds(tx, input.companyId);
    const projectedPercent = (projectedValue / activeMeter.limit) * 100;

    const usageBefore = await ensureUsageStats(tx, {
      companyId: input.companyId,
      workspaceId,
      periodStart: activeMeter.periodStart,
      periodEnd: activeMeter.periodEnd,
    });

    const checkpointBase: BillingCheckpoint = {
      meter: { ...activeMeter, currentValue: projectedValue },
      usage: usageBefore,
      softLimitTriggered: projectedPercent >= softLimit && projectedPercent < hardLimit,
      hardLimitTriggered: projectedPercent >= hardLimit,
    };

    if (checkpointBase.hardLimitTriggered) {
      throw new BillingLimitError("Billing hard cap reached", checkpointBase);
    }

    const updatedMeter = await tx.billingMeter.update({
      where: { id: activeMeter.id },
      data: {
        currentValue: projectedValue,
      },
    });

    const usage = await tx.usageStats.update({
      where: {
        companyId_workspaceId_periodStart_periodEnd: {
          companyId: input.companyId,
          workspaceId,
          periodStart: activeMeter.periodStart,
          periodEnd: activeMeter.periodEnd,
        },
      },
      data: {
        eventsIngested: { increment: amount },
        updatedAt: now,
      },
    });

    return {
      meter: updatedMeter,
      usage,
      softLimitTriggered: checkpointBase.softLimitTriggered,
      hardLimitTriggered: false,
    };
  });
};

/**
 * Tracks query usage for analytics (no enforcement).
 */
export const recordQueryUsage = async (input: BillingIncrementInput): Promise<void> => {
  if (!input.workspaceId) {
    return;
  }
  const amount = input.amount ?? 1;
  const now = new Date();
  const meter = await prisma.billingMeter.findFirst({
    where: meterWhere(input.companyId, now),
    orderBy: { periodEnd: "desc" },
  });

  if (!meter) return;

  await prisma.usageStats.upsert({
    where: {
      companyId_workspaceId_periodStart_periodEnd: {
        companyId: input.companyId,
        workspaceId: input.workspaceId,
        periodStart: meter.periodStart,
        periodEnd: meter.periodEnd,
      },
    },
    create: {
      companyId: input.companyId,
      workspaceId: input.workspaceId,
      periodStart: meter.periodStart,
      periodEnd: meter.periodEnd,
      eventsQueried: amount,
    },
    update: {
      eventsQueried: { increment: amount },
      updatedAt: new Date(),
    },
  });
};

const loadThresholds = async (tx: Prisma.TransactionClient, companyId: string) => {
  const thresholds = await tx.notificationThreshold.findFirst({
    where: {
      companyId,
      meterType: EVENTS_METER,
    },
  });

  return {
    softLimit: thresholds?.softLimitPercent ?? 80,
    hardLimit: thresholds?.hardLimitPercent ?? 100,
  };
};

type UsageKey = {
  companyId: string;
  workspaceId: string;
  periodStart: Date;
  periodEnd: Date;
};

const ensureUsageStats = async (tx: Prisma.TransactionClient, key: UsageKey) => {
  return tx.usageStats.upsert({
    where: {
      companyId_workspaceId_periodStart_periodEnd: {
        companyId: key.companyId,
        workspaceId: key.workspaceId,
        periodStart: key.periodStart,
        periodEnd: key.periodEnd,
      },
    },
    create: {
      companyId: key.companyId,
      workspaceId: key.workspaceId,
      periodStart: key.periodStart,
      periodEnd: key.periodEnd,
    },
    update: {
      updatedAt: new Date(),
    },
  });
};

