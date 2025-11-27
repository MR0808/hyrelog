// sdk/types.ts

export interface HyreLogClientOptions {
    apiKey: string;
    baseUrl?: string;
}

// --------- Models returned ----------

export interface Company {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
    planTier: string;
}

export interface Workspace {
    id: string;
    name: string;
    slug: string;
    companyId: string;
    createdAt: string;
    updatedAt: string;
}

export interface Event {
    id: string;
    type: string;
    timestamp: string;
    metadata?: unknown;
    before?: unknown;
    after?: unknown;
}

export interface PaginatedResponse<T> {
    data: T[];
    nextCursor: string | null;
}
