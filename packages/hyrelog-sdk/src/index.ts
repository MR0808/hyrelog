// src/sdk/types.ts

/* ---------------------------------------------------------
 * Shared Types for SDK
 * --------------------------------------------------------- */

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

    metadata?: any;
    before?: any;
    after?: any;

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

/* ---------------------------------------------------------
 * Company + Workspace Responses
 * --------------------------------------------------------- */

export interface CompanyResponse {
    data: any;
}

export interface WorkspaceResponse {
    data: any;
}

export interface WorkspaceListResponse {
    data: any[];
    nextCursor: string | null;
}

export interface UsageCompanyResponse {
    data: {
        meters: any[];
        daily: any[];
    };
}

export interface UsageWorkspaceResponse {
    data: {
        workspace: any;
        meters: any[];
        daily: any[];
    };
}

/* ---------------------------------------------------------
 * API Keys
 * --------------------------------------------------------- */

export interface ApiKeyInfo {
    id: string;
    name: string;
    scope: 'COMPANY' | 'WORKSPACE';
    companyId: string;
    workspaceId?: string | null;
    createdAt: string;
    revoked: boolean;
}

/* ---------------------------------------------------------
 * Webhook Deliveries
 * --------------------------------------------------------- */

export interface WebhookDeliveryRecord {
    id: string;
    createdAt: string;
    updatedAt: string;

    companyId: string;
    eventId?: string | null;

    url: string;
    status: string;
    attempts: number;
    lastError?: string | null;
    nextAttemptAt?: string | null;

    payload?: any;
}

export interface WebhookDeliveryListResponse {
    data: WebhookDeliveryRecord[];
    nextCursor: string | null;
}
