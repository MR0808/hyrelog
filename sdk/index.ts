// src/sdk/index.ts
import {
    ApiKeyLog,
    CompanyDetailsResponse,
    CompanyUsageResponse,
    Event,
    HyreLogClientOptions,
    PaginatedResponse,
    Workspace,
    WorkspaceUsageResponse
} from './types';

function buildQuery(params?: Record<string, any>): string {
    if (!params) return '';
    const entries = Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null
    );
    if (!entries.length) return '';
    const qs = entries
        .map(
            ([k, v]) =>
                encodeURIComponent(k) + '=' + encodeURIComponent(String(v))
        )
        .join('&');
    return '?' + qs;
}

export class HyreLogClient {
    private apiKey: string;
    private baseUrl: string;
    private fetchFn: typeof fetch;

    constructor(opts: HyreLogClientOptions) {
        this.apiKey = opts.apiKey;
        this.baseUrl = opts.baseUrl ?? 'http://localhost:3001';
        this.fetchFn = opts.fetchFn ?? fetch;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: any,
        query?: Record<string, any>
    ): Promise<T> {
        const url = this.baseUrl.replace(/\/+$/, '') + path + buildQuery(query);
        const headers: Record<string, string> = {
            'x-api-key': this.apiKey
        };

        const init: RequestInit = {
            method,
            headers: body
                ? { ...headers, 'Content-Type': 'application/json' }
                : headers,
            body: body ? JSON.stringify(body) : undefined
        };

        const res = await this.fetchFn(url, init);
        const text = await res.text();
        let json: any = {};

        if (text) {
            try {
                json = JSON.parse(text);
            } catch {
                throw new Error(
                    `HyreLog: failed to parse JSON from ${url}: ${text}`
                );
            }
        }

        if (!res.ok) {
            const message =
                json?.message || json?.error || `HTTP ${res.status}`;
            const err = new Error(`HyreLog error: ${message}`);
            (err as any).status = res.status;
            (err as any).payload = json;
            throw err;
        }

        return json as T;
    }

    // ---------------------------
    // COMPANY
    // ---------------------------

    async getCompany(): Promise<CompanyDetailsResponse> {
        return this.request<CompanyDetailsResponse>('GET', '/v1/company');
    }

    async listCompanyWorkspaces(params?: {
        cursor?: string;
        limit?: number;
    }): Promise<PaginatedResponse<Workspace>> {
        return this.request<PaginatedResponse<Workspace>>(
            'GET',
            '/v1/company/workspaces',
            undefined,
            params
        );
    }

    async getCompanyWorkspace(id: string): Promise<{
        data: {
            workspace: Workspace;
            usage: WorkspaceUsageResponse['data']['usage'];
        };
    }> {
        return this.request<{
            data: {
                workspace: Workspace;
                usage: WorkspaceUsageResponse['data']['usage'];
            };
        }>('GET', `/v1/company/workspaces/${encodeURIComponent(id)}`);
    }

    async getCompanyUsage(): Promise<CompanyUsageResponse> {
        return this.request<CompanyUsageResponse>('GET', '/v1/company/usage');
    }

    async listCompanyApiKeyLogs(params?: {
        cursor?: string;
        limit?: number;
        status?: number;
        method?: string;
        from?: string;
        to?: string;
        apiKeyId?: string;
        path?: string;
        workspaceId?: string;
    }): Promise<PaginatedResponse<ApiKeyLog>> {
        return this.request<PaginatedResponse<ApiKeyLog>>(
            'GET',
            '/v1/company/api-key-logs',
            undefined,
            params
        );
    }

    // ---------------------------
    // WORKSPACES
    // ---------------------------

    async listWorkspaces(params?: {
        cursor?: string;
        limit?: number;
    }): Promise<PaginatedResponse<Workspace>> {
        return this.request<PaginatedResponse<Workspace>>(
            'GET',
            '/v1/workspaces',
            undefined,
            params
        );
    }

    async getWorkspace(id: string): Promise<{
        data: {
            workspace: Workspace;
            usage: WorkspaceUsageResponse['data']['usage'];
        };
    }> {
        return this.request<{
            data: {
                workspace: Workspace;
                usage: WorkspaceUsageResponse['data']['usage'];
            };
        }>('GET', `/v1/workspaces/${encodeURIComponent(id)}`);
    }

    async getWorkspaceUsage(id: string): Promise<WorkspaceUsageResponse> {
        return this.request<WorkspaceUsageResponse>(
            'GET',
            `/v1/workspaces/${encodeURIComponent(id)}/usage`
        );
    }

    async listWorkspaceApiKeyLogs(
        id: string,
        params?: {
            cursor?: string;
            limit?: number;
            status?: number;
            method?: string;
            from?: string;
            to?: string;
            apiKeyId?: string;
            path?: string;
        }
    ): Promise<PaginatedResponse<ApiKeyLog>> {
        return this.request<PaginatedResponse<ApiKeyLog>>(
            'GET',
            `/v1/workspaces/${encodeURIComponent(id)}/api-key-logs`,
            undefined,
            params
        );
    }

    // ---------------------------
    // EVENTS
    // ---------------------------

    async ingestEvent(body: {
        type: string;
        actorId?: string;
        actorType?: string;
        actorName?: string;
        actorEmail?: string;
        metadata?: any;
        before?: any;
        after?: any;
    }): Promise<{ data: Event }> {
        return this.request<{ data: Event }>('POST', '/v1/events', body);
    }

    async listEvents(params?: {
        workspaceId?: string;
        type?: string;
        actorId?: string;
        from?: string;
        to?: string;
        q?: string;
        cursor?: string;
        limit?: number;
    }): Promise<PaginatedResponse<Event>> {
        return this.request<PaginatedResponse<Event>>(
            'GET',
            '/v1/events',
            undefined,
            params
        );
    }

    async exportEvents(params: {
        workspaceId: string;
        type?: string;
        actorId?: string;
        from?: string;
        to?: string;
        q?: string;
        format?: 'json' | 'ndjson' | 'csv';
    }): Promise<any> {
        const path = '/v1/events/export';
        const url =
            this.baseUrl.replace(/\/+$/, '') + path + buildQuery(params);

        const res = await this.fetchFn(url, {
            method: 'GET',
            headers: {
                'x-api-key': this.apiKey
            }
        });

        const text = await res.text();
        if (!res.ok) {
            throw new Error(
                `HyreLog export failed (${res.status}): ${
                    text || res.statusText
                }`
            );
        }

        // Caller can decide how to parse
        if (params.format === 'csv' || params.format === 'ndjson') {
            return text;
        }

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }
}
