/**
 * Builds the OpenAPI 3.1 specification served at /openapi.json.
 */
export declare const buildOpenApiDocument: () => {
    openapi: string;
    info: {
        title: string;
        description: string;
        version: string;
    };
    servers: {
        url: string;
    }[];
    paths: {
        '/v1/key/company': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/workspaces': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        minimum: number;
                        maximum?: never;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        minimum: number;
                        maximum: number;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/workspaces/{workspaceId}': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/events': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                        minimum?: never;
                        maximum?: never;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format?: never;
                        minimum?: never;
                        maximum?: never;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        minimum: number;
                        format?: never;
                        maximum?: never;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        minimum: number;
                        maximum: number;
                        format?: never;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                        headers: {
                            'X-RateLimit-Limit': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                            'X-RateLimit-Remaining': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                            'X-RateLimit-Reset': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/company/usage': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/company/gdpr/export': {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    '202': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/jobs/{jobId}': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace/events': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                        minimum?: never;
                        maximum?: never;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format?: never;
                        minimum?: never;
                        maximum?: never;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        minimum: number;
                        format?: never;
                        maximum?: never;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        minimum: number;
                        maximum: number;
                        format?: never;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                        headers: {
                            'X-RateLimit-Limit': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                            'X-RateLimit-Remaining': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                            'X-RateLimit-Reset': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                        };
                    };
                };
            };
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                $ref: string;
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                    };
                    '402': {
                        description: string;
                    };
                    '429': {
                        description: string;
                        headers: {
                            'Retry-After': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                            'X-RateLimit-Limit': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                            'X-RateLimit-Remaining': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                            'X-RateLimit-Reset': {
                                schema: {
                                    type: string;
                                };
                                description: string;
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/company/export.json': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format?: never;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/export.csv': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format?: never;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/export-archive.json': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format?: never;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                    '403': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace/export.json': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format?: never;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace/export.csv': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format?: never;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace/events/tail': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'text/event-stream': {};
                        };
                    };
                    '403': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace/events/batch': {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    events: {
                                        type: string;
                                        items: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                    };
                    '429': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace/{workspaceId}/schemas': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    eventType: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    jsonSchema: {
                                        type: string;
                                    };
                                    version: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace/{workspaceId}/schemas/{schemaId}': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                    '404': {
                        description: string;
                    };
                };
            };
            put: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    eventType: {
                                        type: string;
                                    };
                                    description: {
                                        type: string;
                                    };
                                    jsonSchema: {
                                        type: string;
                                    };
                                    version: {
                                        type: string;
                                    };
                                    isActive: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
            delete: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    '204': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/workspace/rate-limit': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        limit: {
                                            type: string;
                                        };
                                        remaining: {
                                            type: string;
                                        };
                                        resetAt: {
                                            type: string;
                                            format: string;
                                        };
                                        windowSeconds: {
                                            type: string;
                                        };
                                        limited: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/company/rate-limit': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        limit: {
                                            type: string;
                                        };
                                        remaining: {
                                            type: string;
                                        };
                                        resetAt: {
                                            type: string;
                                            format: string;
                                        };
                                        windowSeconds: {
                                            type: string;
                                        };
                                        limited: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/workspace/create': {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    readOnly: {
                                        type: string;
                                    };
                                    labels: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                    ipAllowlist: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                    expiresAt: {
                                        type: string;
                                        format: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        id: {
                                            type: string;
                                        };
                                        name: {
                                            type: string;
                                        };
                                        prefix: {
                                            type: string;
                                        };
                                        key: {
                                            type: string;
                                            description: string;
                                        };
                                        readOnly: {
                                            type: string;
                                        };
                                        labels: {
                                            type: string;
                                            items: {
                                                type: string;
                                            };
                                        };
                                        expiresAt: {
                                            type: string;
                                            format: string;
                                        };
                                        createdAt: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/workspace/rotate': {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    revokeOld: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        id: {
                                            type: string;
                                        };
                                        name: {
                                            type: string;
                                        };
                                        prefix: {
                                            type: string;
                                        };
                                        key: {
                                            type: string;
                                            description: string;
                                        };
                                        oldKeyRevoked: {
                                            type: string;
                                        };
                                        createdAt: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/workspace/revoke': {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    reason: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        id: {
                                            type: string;
                                        };
                                        revokedAt: {
                                            type: string;
                                            format: string;
                                        };
                                        revokedReason: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/workspace/usage': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        apiKeyId: {
                                            type: string;
                                        };
                                        period: {
                                            type: string;
                                            properties: {
                                                from: {
                                                    type: string;
                                                    format: string;
                                                };
                                                to: {
                                                    type: string;
                                                    format: string;
                                                };
                                            };
                                        };
                                        summary: {
                                            type: string;
                                            properties: {
                                                totalRequests: {
                                                    type: string;
                                                };
                                                successRequests: {
                                                    type: string;
                                                };
                                                errorRequests: {
                                                    type: string;
                                                };
                                                errorRate: {
                                                    type: string;
                                                };
                                                avgLatencyMs: {
                                                    type: string;
                                                };
                                                healthScore: {
                                                    type: string;
                                                };
                                            };
                                        };
                                        endpoints: {
                                            type: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        '/v1/key/company/create': {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    readOnly: {
                                        type: string;
                                    };
                                    labels: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                    ipAllowlist: {
                                        type: string;
                                        items: {
                                            type: string;
                                        };
                                    };
                                    expiresAt: {
                                        type: string;
                                        format: string;
                                    };
                                };
                                required: string[];
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/rotate': {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    name: {
                                        type: string;
                                    };
                                    revokeOld: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/revoke': {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    reason: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/v1/key/company/stats': {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/internal/metrics': {
            get: {
                security: {
                    InternalToken: never[];
                }[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/internal/health': {
            get: {
                security: {
                    InternalToken: never[];
                }[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
    };
    components: {
        securitySchemes: {
            ApiKeyAuth: {
                type: string;
                in: string;
                name: string;
            };
            InternalToken: {
                type: string;
                in: string;
                name: string;
            };
        };
        schemas: {
            IngestEvent: import("zod-to-json-schema").JsonSchema7Type & {
                $schema?: string | undefined;
                definitions?: {
                    [key: string]: import("zod-to-json-schema").JsonSchema7Type;
                } | undefined;
            };
            UsageResponse: import("zod-to-json-schema").JsonSchema7Type & {
                $schema?: string | undefined;
                definitions?: {
                    [key: string]: import("zod-to-json-schema").JsonSchema7Type;
                } | undefined;
            };
        };
    };
};
export type OpenAPIDocument = ReturnType<typeof buildOpenApiDocument>;
//# sourceMappingURL=openapi.d.ts.map