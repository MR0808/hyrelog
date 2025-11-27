// src/sdk/types.ts

export type PlanTier = 'FREE' | 'STARTER' | 'GROWTH' | 'SCALE' | 'ENTERPRISE';

export interface Company {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    slug: string;
    planTier: PlanTier;
    billingInterval: 'MONTHLY' | 'YEARLY';
    eventsPerMonth: number;
    exportsPerMonth: number;
    retentionDays: number;
    unlimitedRetention: boolean;
}

export interface CompanyLimits {
    eventsPerMonth: number;
    exportsPerMonth: number;
    retentionDays: number;
    unlimitedRetention: boolean;
}

export interface Workspace {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    slug: string;
    companyId: string;
}

export interface Event {
    id: string;
    createdAt: string;
    timestamp: string;
    workspaceId: string;
    type: string;
    actorId: string | null;
    actorType: string | null;
    actorName: string | null;
    actorEmail: string | null;
    sourceIp: string | null;
    userAgent: string | null;
    metadata: any | null;
    before: any | null;
    after: any | null;
    chainId: string;
    hash: string;
    prevHash: string | null;
}

export type MeterType = 'EVENTS' | 'WORKSPACES' | 'USERS' | 'EXPORTS';

export interface BillingMeterCompany {
    id: string;
    companyId: string;
    meterType: MeterType;
    periodStart: string;
    periodEnd: string;
    currentValue: number;
    softThreshold: number | null;
    hardCap: boolean;
    unitSize: number;
    unitPrice: number;
    lastIncrementAt: string | null;
}

export interface BillingMeterWorkspace {
    id: string;
    companyId: string;
    workspaceId: string;
    meterType: MeterType;
    periodStart: string;
    periodEnd: string;
    currentValue: number;
    softThreshold: number | null;
    hardCap: boolean;
    unitSize: number;
    unitPrice: number;
    lastIncrementAt: string | null;
}

export interface UsageStatsCompany {
    id: string;
    companyId: string;
    date: string;
    eventsIngested: number;
    eventsStored: number;
    seats: number;
    activeApiKeys: number;
    exportsRun: number;
}

export interface UsageStatsWorkspace {
    id: string;
    companyId: string;
    workspaceId: string;
    date: string;
    eventsIngested: number;
    eventsStored: number;
    exportsRun: number;
}

export interface ApiKeyLog {
    id: string;
    createdAt: string;
    apiKeyId: string;
    companyId: string;
    workspaceId: string | null;
    method: string;
    path: string;
    statusCode: number;
    durationMs: number | null;
    ip: string | null;
    userAgent: string | null;
}

export interface WorkspaceWarnings {
    events: {
        used: number;
        softWarning: boolean;
        hardLimitReached: boolean;
    };
}

export interface CompanyWarnings {
    events: {
        used: number;
        softWarning: boolean;
        hardLimitReached: boolean;
    };
}

export interface PaginatedResponse<T> {
    data: T[];
    nextCursor: string | null;
}

export interface CompanyDetailsResponse {
    data: {
        company: Company;
        limits: CompanyLimits;
        usage: {
            latestDaily: UsageStatsCompany | null;
            latestEventsMeter: BillingMeterCompany | null;
            warnings: CompanyWarnings | null;
        };
    };
}

export interface CompanyUsageResponse {
    data: {
        meters: BillingMeterCompany[];
        daily: UsageStatsCompany[];
    };
}

export interface WorkspaceUsageResponse {
    data: {
        workspace: Workspace;
        meters: BillingMeterWorkspace[];
        daily: UsageStatsWorkspace[];
        warnings: WorkspaceWarnings | null;
    };
}

export interface HyreLogClientOptions {
    apiKey: string;
    baseUrl?: string;
    fetchFn?: typeof fetch;
}
