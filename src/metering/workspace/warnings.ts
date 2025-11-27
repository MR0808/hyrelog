// src/metering/workspace/warnings.ts
import { prisma } from '../../lib/prisma';

export interface WorkspaceWarnings {
    events: {
        used: number;
        softWarning: boolean;
        hardLimitReached: boolean;
    };
}

/**
 * Compute workspace-level warnings based on:
 * - BillingMeterWorkspace
 * - Company limits (eventsPerMonth)
 * - Company soft warning thresholds
 */
export async function getWorkspaceWarnings(
    companyId: string,
    workspaceId: string
): Promise<WorkspaceWarnings | null> {
    const company = await prisma.company.findUnique({
        where: { id: companyId }
    });

    if (!company) return null;

    // Unlimited = no warnings
    if (company.unlimitedRetention && company.eventsPerMonth <= 0) {
        return {
            events: {
                used: 0,
                softWarning: false,
                hardLimitReached: false
            }
        };
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const meter = await prisma.billingMeterWorkspace.findFirst({
        where: {
            companyId,
            workspaceId,
            meterType: 'EVENTS',
            periodStart
        }
    });

    const used = meter?.currentValue ?? 0;
    const cap = company.eventsPerMonth;

    const percentThreshold = company.eventsWarningPercent ?? null;
    const absoluteThreshold = company.eventsWarningAbsolute ?? null;

    let softWarning = false;

    if (absoluteThreshold !== null && used >= absoluteThreshold) {
        softWarning = true;
    }

    if (percentThreshold !== null && used >= (cap * percentThreshold) / 100) {
        softWarning = true;
    }

    // Meter-level soft threshold
    if (meter?.softThreshold && used >= meter.softThreshold) {
        softWarning = true;
    }

    const hardLimitReached = used >= cap;

    return {
        events: {
            used,
            softWarning,
            hardLimitReached
        }
    };
}
