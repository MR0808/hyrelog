import { z } from "zod";

export const companySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  retentionDays: z.number().int(),
});

export const workspaceSummarySchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const projectSummarySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  slug: z.string(),
});

