// sdk/index.ts
import {
    HyreLogClientOptions,
    Company,
    Workspace,
    Event,
    PaginatedResponse
} from './types';

export class HyreLogClient {
    private apiKey: string;
    private baseUrl: string;

    constructor(options: HyreLogClientOptions) {
        this.apiKey = options.apiKey;
        this.baseUrl = options.baseUrl ?? 'https://api.hyrelog.com';
    }

    private async request<T>(path: string, params?: RequestInit): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            ...params,
            headers: {
                'x-api-key': this.apiKey,
                'content-type': 'application/json',
                ...(params?.headers ?? {})
            }
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        return res.json();
    }

    // ---------------- COMPANY ----------------

    getCompany(): Promise<{ data: Company }> {
        return this.request(`/v1/company`);
    }

    listCompanyWorkspaces(query?: {
        cursor?: string;
        limit?: number;
    }): Promise<PaginatedResponse<Workspace>> {
        const qs = new URLSearchParams(query as any).toString();
        return this.request(`/v1/company/workspaces?${qs}`);
    }

    getCompanyStats() {
        return this.request(`/v1/company/stats`);
    }

    // ---------------- WORKSPACE ----------------

    listWorkspaces(query?: {
        cursor?: string;
        limit?: number;
    }): Promise<PaginatedResponse<Workspace>> {
        const qs = new URLSearchParams(query as any).toString();
        return this.request(`/v1/workspaces?${qs}`);
    }

    getWorkspace(id: string): Promise<{ data: Workspace }> {
        return this.request(`/v1/workspaces/${id}`);
    }

    // ---------------- EVENTS ----------------

    ingestEvent(event: Partial<Event>) {
        return this.request(`/v1/events`, {
            method: 'POST',
            body: JSON.stringify(event)
        });
    }

    queryEvents(query?: any): Promise<PaginatedResponse<Event>> {
        const qs = new URLSearchParams(query || {}).toString();
        return this.request(`/v1/events?${qs}`);
    }

    exportEvents(query?: any) {
        const qs = new URLSearchParams(query || {}).toString();
        return this.request(`/v1/events/export?${qs}`);
    }
}
