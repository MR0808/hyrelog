import { z } from "zod";
export declare const usageStatsSchema: z.ZodObject<{
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
    eventsIngested: z.ZodNumber;
    eventsQueried: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    periodStart: string;
    periodEnd: string;
    eventsIngested: number;
    eventsQueried: number;
}, {
    periodStart: string;
    periodEnd: string;
    eventsIngested: number;
    eventsQueried: number;
}>;
export declare const billingMeterSchema: z.ZodObject<{
    meterType: z.ZodString;
    currentValue: z.ZodNumber;
    limit: z.ZodNumber;
    periodStart: z.ZodString;
    periodEnd: z.ZodString;
}, "strip", z.ZodTypeAny, {
    meterType: string;
    periodStart: string;
    periodEnd: string;
    limit: number;
    currentValue: number;
}, {
    meterType: string;
    periodStart: string;
    periodEnd: string;
    limit: number;
    currentValue: number;
}>;
export declare const usageResponseSchema: z.ZodObject<{
    meter: z.ZodObject<{
        meterType: z.ZodString;
        currentValue: z.ZodNumber;
        limit: z.ZodNumber;
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        meterType: string;
        periodStart: string;
        periodEnd: string;
        limit: number;
        currentValue: number;
    }, {
        meterType: string;
        periodStart: string;
        periodEnd: string;
        limit: number;
        currentValue: number;
    }>;
    usage: z.ZodObject<{
        periodStart: z.ZodString;
        periodEnd: z.ZodString;
        eventsIngested: z.ZodNumber;
        eventsQueried: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        periodStart: string;
        periodEnd: string;
        eventsIngested: number;
        eventsQueried: number;
    }, {
        periodStart: string;
        periodEnd: string;
        eventsIngested: number;
        eventsQueried: number;
    }>;
}, "strip", z.ZodTypeAny, {
    meter: {
        meterType: string;
        periodStart: string;
        periodEnd: string;
        limit: number;
        currentValue: number;
    };
    usage: {
        periodStart: string;
        periodEnd: string;
        eventsIngested: number;
        eventsQueried: number;
    };
}, {
    meter: {
        meterType: string;
        periodStart: string;
        periodEnd: string;
        limit: number;
        currentValue: number;
    };
    usage: {
        periodStart: string;
        periodEnd: string;
        eventsIngested: number;
        eventsQueried: number;
    };
}>;
export type UsageResponse = z.infer<typeof usageResponseSchema>;
//# sourceMappingURL=usage.d.ts.map