import crypto from "node:crypto";
const HASH_ALGO = "sha256";
/**
 * Produces a deterministic hash string for an audit event.
 */
export const computeEventHash = (input, prevHash) => {
    const canonicalPayload = canonicalStringify({
        ...input,
        createdAt: input.createdAt.toISOString(),
    });
    return crypto.createHash(HASH_ALGO).update(prevHash ?? "").update(canonicalPayload).digest("hex");
};
/**
 * Stable stringify that sorts object keys recursively for deterministic hashing.
 */
export const canonicalStringify = (value) => {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    const serialized = entries
        .map(([key, val]) => `${JSON.stringify(key)}:${canonicalStringify(val)}`)
        .join(",");
    return `{${serialized}}`;
};
//# sourceMappingURL=hashchain.js.map