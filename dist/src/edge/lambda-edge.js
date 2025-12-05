/**
 * AWS Lambda@Edge function for event ingestion
 * Phase 4: Edge Ingestion Endpoints
 *
 * Deploy to CloudFront Lambda@Edge (viewer-request or origin-request)
 */
export const handler = async (event) => {
    const request = event.Records[0].cf.request;
    // Only handle POST requests
    if (request.method !== 'POST') {
        return {
            status: '405',
            statusDescription: 'Method Not Allowed',
            headers: {
                'content-type': [{ value: 'application/json' }]
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
    try {
        // Parse request body
        const body = JSON.parse(request.body?.data || '{}');
        // Extract API key from headers
        const apiKey = request.headers['x-hyrelog-key']?.[0]?.value;
        if (!apiKey) {
            return {
                status: '401',
                statusDescription: 'Unauthorized',
                headers: {
                    'content-type': [{ value: 'application/json' }]
                },
                body: JSON.stringify({ error: 'API key required' })
            };
        }
        // Get geo metadata from CloudFront
        const country = request.headers['cloudfront-viewer-country']?.[0]?.value ||
            'unknown';
        const city = request.headers['cloudfront-viewer-city']?.[0]?.value || 'unknown';
        // Enhance event with geo metadata
        const enhancedBody = {
            ...body,
            metadata: {
                ...body.metadata,
                _edge: {
                    provider: 'aws-lambda-edge',
                    country,
                    city
                }
            }
        };
        // Forward to primary API
        const apiUrl = process.env.HYRELOG_API_URL || 'https://api.hyrelog.com';
        // Return modified request to forward to origin
        return {
            ...request,
            uri: '/v1/key/workspace/events',
            method: 'POST',
            headers: {
                ...request.headers,
                host: [{ value: new URL(apiUrl).host }],
                'x-hyrelog-key': [{ value: apiKey }],
                'content-type': [{ value: 'application/json' }]
            },
            body: {
                action: 'replace',
                data: JSON.stringify(enhancedBody),
                encoding: 'text',
                inputTruncated: false
            }
        };
    }
    catch (error) {
        return {
            status: '500',
            statusDescription: 'Internal Server Error',
            headers: {
                'content-type': [{ value: 'application/json' }]
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : String(error)
            })
        };
    }
};
//# sourceMappingURL=lambda-edge.js.map