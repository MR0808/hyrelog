import { prisma } from "@/lib/prisma";
import { BillingMeterType, ThresholdType } from "@prisma/client";

import { checkThreshold, createThresholdAlert, getNotificationStubs } from "@/lib/alerts";

/**
 * Checks billing meters against thresholds and creates alerts.
 * Runs every 5-15 minutes.
 */
export const runThresholdChecker = async (): Promise<void> => {
  const now = new Date();

  // Find active billing meters
  const activeMeters = await prisma.billingMeter.findMany({
    where: {
      meterType: BillingMeterType.EVENTS,
      periodStart: {
        lte: now,
      },
      periodEnd: {
        gt: now,
      },
    },
    include: {
      company: {
        include: {
          notificationAlerts: {
            where: {
              meterType: BillingMeterType.EVENTS,
            },
          },
        },
      },
    },
  });

  for (const meter of activeMeters) {
    const thresholds = meter.company.notificationAlerts;
    if (thresholds.length === 0) {
      continue;
    }

    const threshold = thresholds[0]!;
    const currentPercent = (meter.currentValue / meter.limit) * 100;

    // Check soft limit
    if (currentPercent >= threshold.softLimitPercent) {
      const result = checkThreshold(
        currentPercent,
        threshold.softLimitPercent,
        ThresholdType.PERCENTAGE,
      );

      if (result.triggered) {
        // Check if alert already exists for this period
        const existingAlert = await prisma.thresholdAlert.findFirst({
          where: {
            companyId: meter.companyId,
            meterType: BillingMeterType.EVENTS,
            periodStart: meter.periodStart,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: threshold.softLimitPercent,
          },
        });

        if (!existingAlert) {
          await createThresholdAlert({
            companyId: meter.companyId,
            meterType: BillingMeterType.EVENTS,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: threshold.softLimitPercent,
            currentValue: currentPercent,
            periodStart: meter.periodStart,
          });

          // Trigger notification stubs
          const stubs = getNotificationStubs({
            companyId: meter.companyId,
            meterType: BillingMeterType.EVENTS,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: threshold.softLimitPercent,
            currentValue: currentPercent,
          });

          // TODO: Send actual notifications via dashboard
          console.log("Threshold alert triggered:", stubs);
        }
      }
    }

    // Check hard limit
    if (currentPercent >= threshold.hardLimitPercent) {
      const result = checkThreshold(
        currentPercent,
        threshold.hardLimitPercent,
        ThresholdType.PERCENTAGE,
      );

      if (result.triggered) {
        const existingAlert = await prisma.thresholdAlert.findFirst({
          where: {
            companyId: meter.companyId,
            meterType: BillingMeterType.EVENTS,
            periodStart: meter.periodStart,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: threshold.hardLimitPercent,
          },
        });

        if (!existingAlert) {
          await createThresholdAlert({
            companyId: meter.companyId,
            meterType: BillingMeterType.EVENTS,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: threshold.hardLimitPercent,
            currentValue: currentPercent,
            periodStart: meter.periodStart,
          });

          const stubs = getNotificationStubs({
            companyId: meter.companyId,
            meterType: BillingMeterType.EVENTS,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: threshold.hardLimitPercent,
            currentValue: currentPercent,
          });

          console.log("Hard limit threshold alert triggered:", stubs);
        }
      }
    }
  }
};

