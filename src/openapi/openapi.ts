import { zodToJsonSchema } from 'zod-to-json-schema';

import { ingestEventSchema } from '@/schemas/events';
import { usageResponseSchema } from '@/schemas/usage';

const eventIngestSchema = zodToJsonSchema(
    ingestEventSchema as any,
    'IngestEvent'
);
const usageSchema = zodToJsonSchema(
    usageResponseSchema as any,
    'UsageResponse'
);

/**
 * Builds the OpenAPI 3.1 specification served at /openapi.json.
 */
export const buildOpenApiDocument = () => ({
    openapi: '3.1.0',
    info: {
        title: 'HyreLog Data API',
        description:
            'Audit trail ingestion and analytics API for companies and workspaces.',
        version: '1.0.0'
    },
    servers: [
        {
            url: 'https://api.hyrelog.com'
        }
    ],
    paths: {
        '/v1/key/company': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Get company details',
                responses: {
                    '200': {
                        description: 'Company info'
                    }
                }
            }
        },
        '/v1/key/company/workspaces': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'List company workspaces',
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        schema: { type: 'integer', minimum: 1 }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', minimum: 1, maximum: 500 }
                    }
                ],
                responses: {
                    '200': { description: 'Paginated workspaces' }
                }
            }
        },
        '/v1/key/company/workspaces/{workspaceId}': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Workspace details',
                parameters: [
                    {
                        name: 'workspaceId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'Workspace info' }
                }
            }
        },
        '/v1/key/company/events': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Query events across company',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    { name: 'action', in: 'query', schema: { type: 'string' } },
                    {
                        name: 'category',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'actorId',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'actorEmail',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'workspaceId',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'projectId',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'page',
                        in: 'query',
                        schema: { type: 'integer', minimum: 1 }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', minimum: 1, maximum: 500 }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Paginated events',
                        headers: {
                            'X-RateLimit-Limit': {
                                schema: { type: 'string' },
                                description: 'Maximum requests allowed'
                            },
                            'X-RateLimit-Remaining': {
                                schema: { type: 'string' },
                                description:
                                    'Remaining requests in current window'
                            },
                            'X-RateLimit-Reset': {
                                schema: { type: 'string' },
                                description: 'ISO timestamp when limit resets'
                            }
                        }
                    }
                }
            }
        },
        '/v1/key/company/usage': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Company usage stats',
                responses: {
                    '200': {
                        description: 'Usage stats',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/UsageResponse'
                                }
                            }
                        }
                    }
                }
            }
        },
        '/v1/key/company/gdpr/export': {
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Queue GDPR export',
                responses: {
                    '202': { description: 'Export queued' }
                }
            }
        },
        '/v1/key/company/jobs/{jobId}': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Get job status',
                parameters: [
                    {
                        name: 'jobId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'Job details' }
                }
            }
        },
        '/v1/key/workspace': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Get workspace info',
                responses: {
                    '200': { description: 'Workspace details' }
                }
            }
        },
        '/v1/key/workspace/events': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'List workspace events',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    { name: 'action', in: 'query', schema: { type: 'string' } },
                    {
                        name: 'category',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'actorId',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'actorEmail',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'projectId',
                        in: 'query',
                        schema: { type: 'string' }
                    },
                    {
                        name: 'page',
                        in: 'query',
                        schema: { type: 'integer', minimum: 1 }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', minimum: 1, maximum: 500 }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Paginated events',
                        headers: {
                            'X-RateLimit-Limit': {
                                schema: { type: 'string' },
                                description: 'Maximum requests allowed'
                            },
                            'X-RateLimit-Remaining': {
                                schema: { type: 'string' },
                                description:
                                    'Remaining requests in current window'
                            },
                            'X-RateLimit-Reset': {
                                schema: { type: 'string' },
                                description: 'ISO timestamp when limit resets'
                            }
                        }
                    }
                }
            },
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Ingest workspace event',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/IngestEvent' }
                        }
                    }
                },
                responses: {
                    '201': { description: 'Event created' },
                    '402': { description: 'Billing enforcement' },
                    '429': {
                        description: 'Rate limited',
                        headers: {
                            'Retry-After': {
                                schema: { type: 'string' },
                                description: 'Seconds to wait before retrying'
                            },
                            'X-RateLimit-Limit': {
                                schema: { type: 'string' },
                                description: 'Maximum requests allowed'
                            },
                            'X-RateLimit-Remaining': {
                                schema: { type: 'string' },
                                description:
                                    'Remaining requests in current window'
                            },
                            'X-RateLimit-Reset': {
                                schema: { type: 'string' },
                                description: 'ISO timestamp when limit resets'
                            }
                        }
                    }
                }
            }
        },
        '/v1/key/company/export.json': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Export company events as JSON',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    { name: 'action', in: 'query', schema: { type: 'string' } },
                    {
                        name: 'category',
                        in: 'query',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'JSON export stream' }
                }
            }
        },
        '/v1/key/company/export.csv': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Export company events as CSV',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    { name: 'action', in: 'query', schema: { type: 'string' } },
                    {
                        name: 'category',
                        in: 'query',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'CSV export stream' }
                }
            }
        },
        '/v1/key/company/export-archive.json': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Export archived events from S3',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'workspaceId',
                        in: 'query',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'Archived events JSON stream' },
                    '403': { description: 'S3 archival add-on required' }
                }
            }
        },
        '/v1/key/workspace/export.json': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Export workspace events as JSON',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    { name: 'action', in: 'query', schema: { type: 'string' } },
                    {
                        name: 'category',
                        in: 'query',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'JSON export stream' }
                }
            }
        },
        '/v1/key/workspace/export.csv': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Export workspace events as CSV',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    { name: 'action', in: 'query', schema: { type: 'string' } },
                    {
                        name: 'category',
                        in: 'query',
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'CSV export stream' }
                }
            }
        },
        '/v1/key/workspace/events/tail': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Stream events via Server-Sent Events (SSE)',
                responses: {
                    '200': {
                        description: 'SSE stream',
                        content: {
                            'text/event-stream': {}
                        }
                    },
                    '403': { description: 'Growth plan+ required' }
                }
            }
        },
        '/v1/key/workspace/events/batch': {
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Ingest multiple events in a batch',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    events: {
                                        type: 'array',
                                        items: {
                                            $ref: '#/components/schemas/IngestEvent'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '201': { description: 'Events created' },
                    '429': { description: 'Rate limited' }
                }
            }
        },
        // Phase 4: Schema Registry
        '/v1/key/workspace/{workspaceId}/schemas': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'List event schemas',
                parameters: [
                    {
                        name: 'workspaceId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'List of schemas' }
                }
            },
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Create event schema',
                parameters: [
                    {
                        name: 'workspaceId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    eventType: { type: 'string' },
                                    description: { type: 'string' },
                                    jsonSchema: { type: 'object' },
                                    version: { type: 'integer' },
                                    isActive: { type: 'boolean' }
                                },
                                required: ['eventType', 'jsonSchema']
                            }
                        }
                    }
                },
                responses: {
                    '201': { description: 'Schema created' }
                }
            }
        },
        '/v1/key/workspace/{workspaceId}/schemas/{schemaId}': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Get event schema',
                parameters: [
                    {
                        name: 'workspaceId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    },
                    {
                        name: 'schemaId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'Schema details' },
                    '404': { description: 'Schema not found' }
                }
            },
            put: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Update event schema',
                parameters: [
                    {
                        name: 'workspaceId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    },
                    {
                        name: 'schemaId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    eventType: { type: 'string' },
                                    description: { type: 'string' },
                                    jsonSchema: { type: 'object' },
                                    version: { type: 'integer' },
                                    isActive: { type: 'boolean' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Schema updated' }
                }
            },
            delete: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Delete event schema',
                parameters: [
                    {
                        name: 'workspaceId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    },
                    {
                        name: 'schemaId',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '204': { description: 'Schema deleted' }
                }
            }
        },
        // Phase 4: Rate Limits
        '/v1/key/workspace/rate-limit': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Get rate limit status for workspace key',
                responses: {
                    '200': {
                        description: 'Rate limit status',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        limit: { type: 'integer' },
                                        remaining: { type: 'integer' },
                                        resetAt: {
                                            type: 'string',
                                            format: 'date-time'
                                        },
                                        windowSeconds: { type: 'integer' },
                                        limited: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/v1/key/company/rate-limit': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Get rate limit status for company key',
                responses: {
                    '200': {
                        description: 'Rate limit status',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        limit: { type: 'integer' },
                                        remaining: { type: 'integer' },
                                        resetAt: {
                                            type: 'string',
                                            format: 'date-time'
                                        },
                                        windowSeconds: { type: 'integer' },
                                        limited: { type: 'boolean' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        // Phase 4: API Key Lifecycle
        '/v1/key/workspace/create': {
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Create a new workspace API key',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    readOnly: { type: 'boolean' },
                                    labels: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    },
                                    ipAllowlist: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    },
                                    expiresAt: {
                                        type: 'string',
                                        format: 'date-time'
                                    }
                                },
                                required: ['name']
                            }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'API key created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        prefix: { type: 'string' },
                                        key: {
                                            type: 'string',
                                            description:
                                                'Only returned on creation'
                                        },
                                        readOnly: { type: 'boolean' },
                                        labels: {
                                            type: 'array',
                                            items: { type: 'string' }
                                        },
                                        expiresAt: {
                                            type: 'string',
                                            format: 'date-time'
                                        },
                                        createdAt: {
                                            type: 'string',
                                            format: 'date-time'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/v1/key/workspace/rotate': {
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Rotate workspace API key',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    revokeOld: { type: 'boolean' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'API key rotated',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        name: { type: 'string' },
                                        prefix: { type: 'string' },
                                        key: {
                                            type: 'string',
                                            description:
                                                'Only returned on creation'
                                        },
                                        oldKeyRevoked: { type: 'boolean' },
                                        createdAt: {
                                            type: 'string',
                                            format: 'date-time'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/v1/key/workspace/revoke': {
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Revoke workspace API key',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    reason: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'API key revoked',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        revokedAt: {
                                            type: 'string',
                                            format: 'date-time'
                                        },
                                        revokedReason: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/v1/key/workspace/usage': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Get API key usage statistics',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Usage statistics',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        apiKeyId: { type: 'string' },
                                        period: {
                                            type: 'object',
                                            properties: {
                                                from: {
                                                    type: 'string',
                                                    format: 'date-time'
                                                },
                                                to: {
                                                    type: 'string',
                                                    format: 'date-time'
                                                }
                                            }
                                        },
                                        summary: {
                                            type: 'object',
                                            properties: {
                                                totalRequests: {
                                                    type: 'integer'
                                                },
                                                successRequests: {
                                                    type: 'integer'
                                                },
                                                errorRequests: {
                                                    type: 'integer'
                                                },
                                                errorRate: { type: 'number' },
                                                avgLatencyMs: {
                                                    type: 'integer'
                                                },
                                                healthScore: { type: 'integer' }
                                            }
                                        },
                                        endpoints: { type: 'object' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/v1/key/company/create': {
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Create a new company API key',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    readOnly: { type: 'boolean' },
                                    labels: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    },
                                    ipAllowlist: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    },
                                    expiresAt: {
                                        type: 'string',
                                        format: 'date-time'
                                    }
                                },
                                required: ['name']
                            }
                        }
                    }
                },
                responses: {
                    '201': { description: 'API key created' }
                }
            }
        },
        '/v1/key/company/rotate': {
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Rotate company API key',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    revokeOld: { type: 'boolean' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'API key rotated' }
                }
            }
        },
        '/v1/key/company/revoke': {
            post: {
                security: [{ ApiKeyAuth: [] }],
                summary: 'Revoke company API key',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    reason: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'API key revoked' }
                }
            }
        },
        '/v1/key/company/stats': {
            get: {
                security: [{ ApiKeyAuth: [] }],
                summary:
                    'Get company API key usage statistics and health metrics',
                parameters: [
                    {
                        name: 'from',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    },
                    {
                        name: 'to',
                        in: 'query',
                        schema: { type: 'string', format: 'date-time' }
                    }
                ],
                responses: {
                    '200': {
                        description:
                            'API key usage statistics and health metrics'
                    }
                }
            }
        },
        '/internal/metrics': {
            get: {
                security: [{ InternalToken: [] }],
                summary: 'Internal system metrics',
                responses: {
                    '200': { description: 'Metrics data' }
                }
            }
        },
        '/internal/health': {
            get: {
                security: [{ InternalToken: [] }],
                summary: 'Internal health check',
                responses: {
                    '200': { description: 'Health status' }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'x-hyrelog-key'
            },
            InternalToken: {
                type: 'apiKey',
                in: 'header',
                name: 'x-internal-token'
            }
        },
        schemas: {
            IngestEvent: eventIngestSchema,
            UsageResponse: usageSchema
        }
    }
});

export type OpenAPIDocument = ReturnType<typeof buildOpenApiDocument>;
