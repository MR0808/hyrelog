// src/lib/metering/warnings.ts
import { checkSoftLimit } from './limits';

export async function sendUsageWarningIfNeeded(companyId: string) {
    const result = await checkSoftLimit(companyId);

    if (!result.softExceeded) return;

    // TODO: integrate with email or webhook
    console.warn(
        `[USAGE WARNING] Company ${companyId} used ${result.usage.events}/${
            result.limits.eventsPerMonth
        } events (${result.eventPct.toFixed(1)}%)`
    );
}
