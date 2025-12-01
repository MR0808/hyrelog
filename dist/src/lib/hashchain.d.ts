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
/**
 * Produces a deterministic hash string for an audit event.
 */
export declare const computeEventHash: (input: HashInput, prevHash: string | null) => string;
/**
 * Stable stringify that sorts object keys recursively for deterministic hashing.
 */
export declare const canonicalStringify: (value: unknown) => string;
//# sourceMappingURL=hashchain.d.ts.map