import { MeterType } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Enforce event ingestion limit.
 * Uses BillingMeterCompany + Company plan limits.
 */
export async function enforceEventLimit(
    companyId: string,
    workspaceId: string
) {
    const [company, companyMeter, workspaceMeter] = await Promise.all([
        prisma.company.findUnique({ where: { id: companyId } }),
        prisma.billingMeterCompany.findFirst({
            where: { companyId, meterType: MeterType.EVENTS },
            orderBy: { periodStart: 'desc' }
        }),
        prisma.billingMeterWorkspace.findFirst({
            where: { companyId, workspaceId, meterType: MeterType.EVENTS },
            orderBy: { periodStart: 'desc' }
        })
    ]);

    if (!company) return { allowed: false, reason: 'COMPANY_NOT_FOUND' };

    const companyUsed = companyMeter?.currentValue ?? 0;
    const workspaceUsed = workspaceMeter?.currentValue ?? 0;

    const cap = company.eventsPerMonth;

    // Company-wide cap
    if (companyUsed >= cap) {
        return { allowed: false, used: companyUsed, cap };
    }

    // Workspace cap is *soft* (per-meter softThreshold)
    if (
        workspaceMeter?.softThreshold &&
        workspaceUsed > workspaceMeter.softThreshold
    ) {
        return {
            allowed: true,
            softWarning: true,
            used: workspaceUsed,
            softThreshold: workspaceMeter.softThreshold
        };
    }

    return { allowed: true, used: workspaceUsed, cap };
}
