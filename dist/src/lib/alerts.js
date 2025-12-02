import { prisma } from "@/lib/prisma";
/**
 * Checks if a threshold has been exceeded.
 */
export const checkThreshold = (currentValue, thresholdValue, thresholdType) => {
    let triggered = false;
    if (thresholdType === "ABSOLUTE") {
        triggered = currentValue >= thresholdValue;
    }
    else if (thresholdType === "PERCENTAGE") {
        // For percentage, thresholdValue is the percentage (0-100)
        // This would need a limit value to calculate percentage
        // For now, we'll assume it's already calculated
        triggered = currentValue >= thresholdValue;
    }
    return {
        triggered,
        currentValue,
        thresholdValue,
        thresholdType,
    };
};
/**
 * Creates a threshold alert record.
 */
export const createThresholdAlert = async (input) => {
    await prisma.thresholdAlert.create({
        data: input,
    });
};
/**
 * Gets notification stubs for threshold alerts.
 * In production, these would trigger actual notifications.
 */
export const getNotificationStubs = (alert) => {
    return {
        email: {
            to: "admin@company.com", // Would come from company settings
            subject: `Threshold Alert: ${alert.meterType}`,
            body: `Threshold ${alert.thresholdType} of ${alert.thresholdValue} exceeded. Current: ${alert.currentValue}`,
        },
        slack: {
            webhook: "https://hooks.slack.com/...", // Would come from company settings
            message: `Alert: ${alert.meterType} threshold exceeded`,
        },
        customWebhook: {
            url: "https://company.com/webhook", // Would come from company settings
            payload: alert,
        },
    };
};
//# sourceMappingURL=alerts.js.map