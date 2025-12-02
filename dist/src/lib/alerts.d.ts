import type { BillingMeterType, ThresholdType } from "@prisma/client";
export type ThresholdCheckResult = {
    triggered: boolean;
    currentValue: number;
    thresholdValue: number;
    thresholdType: ThresholdType;
};
/**
 * Checks if a threshold has been exceeded.
 */
export declare const checkThreshold: (currentValue: number, thresholdValue: number, thresholdType: ThresholdType) => ThresholdCheckResult;
/**
 * Creates a threshold alert record.
 */
export declare const createThresholdAlert: (input: {
    companyId: string;
    meterType: BillingMeterType;
    thresholdType: ThresholdType;
    thresholdValue: number;
    currentValue: number;
    periodStart: Date;
}) => Promise<void>;
/**
 * Gets notification stubs for threshold alerts.
 * In production, these would trigger actual notifications.
 */
export declare const getNotificationStubs: (alert: {
    companyId: string;
    meterType: BillingMeterType;
    thresholdType: ThresholdType;
    thresholdValue: number;
    currentValue: number;
}) => {
    email: {
        to: string;
        subject: string;
        body: string;
    };
    slack: {
        webhook: string;
        message: string;
    };
    customWebhook: {
        url: string;
        payload: {
            companyId: string;
            meterType: BillingMeterType;
            thresholdType: ThresholdType;
            thresholdValue: number;
            currentValue: number;
        };
    };
};
//# sourceMappingURL=alerts.d.ts.map