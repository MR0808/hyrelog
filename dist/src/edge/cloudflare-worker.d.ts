/**
 * Cloudflare Workers edge ingestion endpoint
 * Phase 4: Edge Ingestion Endpoints
 *
 * Deploy this to Cloudflare Workers for edge event ingestion
 */
export interface Env {
    HYRELOG_API_URL: string;
    HYRELOG_WORKSPACE_KEY?: string;
}
interface CloudflareRequest extends Request {
    cf?: {
        country?: string;
        city?: string;
        region?: string;
        colo?: string;
    };
}
declare const _default: {
    fetch(request: CloudflareRequest, env: Env): Promise<Response>;
};
export default _default;
//# sourceMappingURL=cloudflare-worker.d.ts.map