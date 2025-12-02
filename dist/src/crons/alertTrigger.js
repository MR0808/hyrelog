import { prisma } from "@/lib/prisma";
import { getNotificationStubs } from "@/lib/alerts";
/**
 * Triggers notifications for threshold alerts.
 * Runs every 5-15 minutes.
 */
export const runAlertTrigger = async () => {
    // Find recent threshold alerts that haven't been notified
    const recentAlerts = await prisma.thresholdAlert.findMany({
        where: {
            createdAt: {
                gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
            },
        },
        include: {
            company: true,
        },
        take: 100,
    });
    for (const alert of recentAlerts) {
        const stubs = getNotificationStubs({
            companyId: alert.companyId,
            meterType: alert.meterType,
            thresholdType: alert.thresholdType,
            thresholdValue: alert.thresholdValue,
            currentValue: alert.currentValue,
        });
        // TODO: Send actual notifications via dashboard service
        console.log(`Alert notification stubs for company ${alert.companyId}:`, stubs);
        // In production, this would:
        // 1. Send email via email service
        // 2. Post to Slack webhook
        // 3. Call custom webhook URL
    }
};
//# sourceMappingURL=alertTrigger.js.map