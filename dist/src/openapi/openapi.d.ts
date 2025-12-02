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
        "/v1/key/company": {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/company/workspaces": {
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
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/company/workspaces/{workspaceId}": {
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
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/company/events": {
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
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/company/usage": {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        "/v1/key/company/gdpr/export": {
            post: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    "202": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/company/jobs/{jobId}": {
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
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/workspace": {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/workspace/events": {
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
                    "200": {
                        description: string;
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
                        "application/json": {
                            schema: {
                                $ref: string;
                            };
                        };
                    };
                };
                responses: {
                    "201": {
                        description: string;
                    };
                    "402": {
                        description: string;
                    };
                    "429": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/company/export.json": {
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
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/company/export.csv": {
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
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/company/export-archive.json": {
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
                    "200": {
                        description: string;
                    };
                    "403": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/workspace/export.json": {
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
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/workspace/export.csv": {
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
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/v1/key/workspace/events/tail": {
            get: {
                security: {
                    ApiKeyAuth: never[];
                }[];
                summary: string;
                responses: {
                    "200": {
                        description: string;
                        content: {
                            "text/event-stream": {};
                        };
                    };
                    "403": {
                        description: string;
                    };
                };
            };
        };
        "/internal/metrics": {
            get: {
                security: {
                    InternalToken: never[];
                }[];
                summary: string;
                responses: {
                    "200": {
                        description: string;
                    };
                };
            };
        };
        "/internal/health": {
            get: {
                security: {
                    InternalToken: never[];
                }[];
                summary: string;
                responses: {
                    "200": {
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