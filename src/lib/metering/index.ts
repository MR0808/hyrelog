// src/lib/metering/index.ts
import { incrementMonthlyMeter } from './monthly';
import { recordDailyEvent, recordDailyExport } from './daily';
import { sendUsageWarningIfNeeded } from './warnings';
import { MeterType } from '../../generated/prisma/client';

/**
 * Call when an event is ingested.
 */
export async function meterEventIngest(companyId: string, workspaceId: string) {
    await incrementMonthlyMeter(companyId, null, MeterType.EVENTS, 1);
    await recordDailyEvent(companyId, workspaceId);
    await sendUsageWarningIfNeeded(companyId);
}

/**
 * Call when a workspace export endpoint is used.
 */
export async function meterExport(
    companyId: string,
    workspaceId: string | null
) {
    await incrementMonthlyMeter(companyId, null, MeterType.EXPORTS, 1);
    await recordDailyExport(companyId, workspaceId);
    // Optional: add warnings for exports too
}
