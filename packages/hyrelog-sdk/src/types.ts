// sdk/types.ts

// -----------------------------
// Events
// -----------------------------
export interface EventRecord {
    id: string;
    createdAt: string;
    timestamp: string;
    workspaceId: string;
    type: string;
    actorId?: string | null;
    actorType?: string | null;
    actorName?: string | null;
    actorEmail?: string | null;
    sourceIp?: string | null;
    userAgent?: string | null;
    metadata?: unknown | null;
    before?: unknown | null;
    after?: unknown | null;
    chainId: string;
    hash: string;
    prevHash?: string | null;
}

export interface PaginatedEventsResponse {
    data: EventRecord[];
    nextCursor: string | null;
}

export interface EventQueryParams {
    workspaceId?: string;
    type?: string;
    actorId?: string;
    from?: string;
    to?: string;
    q?: string;
    cursor?: string;
    limit?: number;
}

export interface EventExportParams extends EventQueryParams {
    format?: 'json' | 'ndjson' | 'csv';
}

// -----------------------------
// Company
// -----------------------------
export interface CompanyInfo {
    data: {
        company: {
            id: string;
            name: string;
            slug: string;
            planTier: string;
            retentionDays: number | null;
            unlimitedRetention: boolean | null;
            eventsPerMonth: number;
            exportsPerMonth: number;
        };
        limits: {
            retentionDays: number | null;
            unlimitedRetention: boolean;
            eventsPerMonth: number;
            exportsPerMonth: number;
        };
        usage: {
            latestDaily: any | null;
            latestEventsMeter: any | null;
        };
    };
}

export interface CompanyUsageResponse {
    data: {
        meters: any[];
        daily: any[];
    };
}

// -----------------------------
// Workspaces
// -----------------------------
export interface WorkspaceRecord {
    id: string;
    name: string;
    slug: string;
    companyId: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkspaceUsageResponse {
    data: {
        workspace: WorkspaceRecord;
        meters: any[];
        daily: any[];
    };
}

// -----------------------------
// API Keys
// -----------------------------
export interface ApiKeyRecord {
    id: string;
    name: string;
    scope: 'COMPANY' | 'WORKSPACE';
    keyPrefix: string;
    companyId: string;
    workspaceId?: string | null;
    revoked: boolean;
    createdAt: string;
    lastUsedAt?: string | null;
}

// -----------------------------
// Webhooks
// -----------------------------
export interface WebhookDeliveryRecord {
    id: string;
    companyId: string;
    eventId?: string | null;
    url: string;
    status: string;
    attempts: number;
    lastError?: string | null;
    nextAttemptAt?: string | null;
    payload?: unknown;
    createdAt: string;
}

export interface HyreLogErrorData {
    error?: string;
    code?: string;
    [key: string]: any;
}
