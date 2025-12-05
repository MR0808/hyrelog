import { z } from "zod";
export declare const usageStatsSchema: z.ZodObject<{
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    eventsIngested: z.ZodNumber;
    eventsQueried: z.ZodNumber;
}, z.core.$strip>;
export declare const billingMeterSchema: z.ZodObject<{
    meterType: z.ZodString;
    currentValue: z.ZodNumber;
    limit: z.ZodNumber;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
}, z.core.$strip>;
export declare const usageResponseSchema: z.ZodObject<{
    meter: z.ZodObject<{
        meterType: z.ZodString;
        currentValue: z.ZodNumber;
        limit: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
    }, z.core.$strip>;
    usage: z.ZodObject<{
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        eventsIngested: z.ZodNumber;
        eventsQueried: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type UsageResponse = z.infer<typeof usageResponseSchema>;
//# sourceMappingURL=usage.d.ts.map