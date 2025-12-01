import crypto from "node:crypto";

export type HashInput = {
  workspaceId: string;
  projectId?: string | null;
  companyId: string;
  action: string;
  category: string;
  payload: unknown;
  metadata?: unknown;
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  createdAt: Date;
};

const HASH_ALGO = "sha256";

/**
 * Produces a deterministic hash string for an audit event.
 */
export const computeEventHash = (input: HashInput, prevHash: string | null): string => {
  const canonicalPayload = canonicalStringify({
    ...input,
    createdAt: input.createdAt.toISOString(),
  });

  return crypto.createHash(HASH_ALGO).update(prevHash ?? "").update(canonicalPayload).digest("hex");
};

/**
 * Stable stringify that sorts object keys recursively for deterministic hashing.
 */
export const canonicalStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  const serialized = entries
    .map(([key, val]) => `${JSON.stringify(key)}:${canonicalStringify(val)}`)
    .join(",");
  return `{${serialized}}`;
};

