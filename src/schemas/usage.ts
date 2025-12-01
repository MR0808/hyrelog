import { z } from "zod";

export const usageStatsSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  eventsIngested: z.number().int().nonnegative(),
  eventsQueried: z.number().int().nonnegative(),
});

export const billingMeterSchema = z.object({
  meterType: z.string(),
  currentValue: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export const usageResponseSchema = z.object({
  meter: billingMeterSchema,
  usage: usageStatsSchema,
});

export type UsageResponse = z.infer<typeof usageResponseSchema>;

