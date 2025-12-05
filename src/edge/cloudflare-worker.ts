/**
 * Cloudflare Workers edge ingestion endpoint
 * Phase 4: Edge Ingestion Endpoints
 *
 * Deploy this to Cloudflare Workers for edge event ingestion
 */

export interface Env {
    HYRELOG_API_URL: string; // Primary API URL (e.g., https://api.hyrelog.com)
    HYRELOG_WORKSPACE_KEY?: string; // Optional: default workspace key
}

// Extend Request to include Cloudflare-specific properties
interface CloudflareRequest extends Request {
    cf?: {
        country?: string;
        city?: string;
        region?: string;
        colo?: string;
    };
}

export default {
    async fetch(request: CloudflareRequest, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers':
                        'Content-Type, x-hyrelog-key'
                }
            });
        }

        // Only allow POST
        if (request.method !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'Method not allowed' }),
                {
                    status: 405,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        try {
            // Parse request body
            const body = (await request.json()) as Record<string, unknown>;

            // Extract API key from header or use default
            const apiKey =
                request.headers.get('x-hyrelog-key') ||
                env.HYRELOG_WORKSPACE_KEY;
            if (!apiKey) {
                return new Response(
                    JSON.stringify({ error: 'API key required' }),
                    {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            // Add geo metadata from Cloudflare
            const country = request.cf?.country || 'unknown';
            const city = request.cf?.city || 'unknown';
            const region = request.cf?.region || 'unknown';

            const enhancedBody: Record<string, unknown> = {
                ...body,
                metadata: {
                    ...(body.metadata && typeof body.metadata === 'object'
                        ? body.metadata
                        : {}),
                    _edge: {
                        provider: 'cloudflare',
                        country,
                        city,
                        region,
                        colo: request.cf?.colo || 'unknown'
                    }
                }
            };

            // Forward to primary API
            const apiUrl = env.HYRELOG_API_URL || 'https://api.hyrelog.com';
            const response = await fetch(`${apiUrl}/v1/key/workspace/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hyrelog-key': apiKey
                },
                body: JSON.stringify(enhancedBody)
            });

            const responseData = await response.json();

            return new Response(JSON.stringify(responseData), {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        } catch (error) {
            return new Response(
                JSON.stringify({
                    error: 'Internal server error',
                    message:
                        error instanceof Error ? error.message : String(error)
                }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    }
};
