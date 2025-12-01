import type { Company, Workspace } from "@prisma/client";

export type RetentionContext = {
  company: Pick<Company, "retentionDays">;
  workspace?: Pick<Workspace, "retentionDays"> | null;
};

const DAY_IN_MS = 86_400_000;

/**
 * Returns the earliest timestamp events can be returned for.
 */
export const getRetentionWindowStart = (
  ctx: RetentionContext,
  now: Date = new Date(),
): { start: Date; retentionApplied: boolean } => {
  const retentionDays = ctx.workspace?.retentionDays ?? ctx.company.retentionDays;
  const start = new Date(now.getTime() - retentionDays * DAY_IN_MS);
  return {
    start,
    retentionApplied: true,
  };
};

