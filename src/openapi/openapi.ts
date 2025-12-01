import { zodToJsonSchema } from "zod-to-json-schema";

import { ingestEventSchema } from "@/schemas/events";
import { usageResponseSchema } from "@/schemas/usage";

const eventIngestSchema = zodToJsonSchema(ingestEventSchema, "IngestEvent");
const usageSchema = zodToJsonSchema(usageResponseSchema, "UsageResponse");

/**
 * Builds the OpenAPI 3.1 specification served at /openapi.json.
 */
export const buildOpenApiDocument = () => ({
  openapi: "3.1.0",
  info: {
    title: "HyreLog Data API",
    description: "Audit trail ingestion and analytics API for companies and workspaces.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "https://api.hyrelog.com",
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-hyrelog-key",
      },
    },
    schemas: {
      IngestEvent: eventIngestSchema,
      UsageResponse: usageSchema,
    },
  },
  paths: {
    "/v1/key/company": {
      get: {
        security: [{ ApiKeyAuth: [] }],
        summary: "Get company details",
        responses: {
          "200": {
            description: "Company info",
          },
        },
      },
    },
    "/v1/key/company/workspaces": {
      get: {
        security: [{ ApiKeyAuth: [] }],
        summary: "List company workspaces",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500 } },
        ],
        responses: {
          "200": { description: "Paginated workspaces" },
        },
      },
    },
    "/v1/key/company/workspaces/{workspaceId}": {
      get: {
        security: [{ ApiKeyAuth: [] }],
        summary: "Workspace details",
        parameters: [
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Workspace info" },
        },
      },
    },
    "/v1/key/company/events": {
      get: {
        security: [{ ApiKeyAuth: [] }],
        summary: "Query events across company",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "actorId", in: "query", schema: { type: "string" } },
          { name: "actorEmail", in: "query", schema: { type: "string" } },
          { name: "workspaceId", in: "query", schema: { type: "string" } },
          { name: "projectId", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500 } },
        ],
        responses: {
          "200": { description: "Paginated events" },
        },
      },
    },
    "/v1/key/company/usage": {
      get: {
        security: [{ ApiKeyAuth: [] }],
        summary: "Company usage stats",
        responses: {
          "200": {
            description: "Usage stats",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UsageResponse" },
              },
            },
          },
        },
      },
    },
    "/v1/key/company/gdpr/export": {
      post: {
        security: [{ ApiKeyAuth: [] }],
        summary: "Queue GDPR export",
        responses: {
          "202": { description: "Export queued" },
        },
      },
    },
    "/v1/key/company/gdpr/delete": {
      post: {
        security: [{ ApiKeyAuth: [] }],
        summary: "Submit GDPR deletion",
        responses: {
          "202": { description: "Delete accepted" },
        },
      },
    },
    "/v1/key/workspace": {
      get: {
        security: [{ ApiKeyAuth: [] }],
        summary: "Get workspace info",
        responses: {
          "200": { description: "Workspace details" },
        },
      },
    },
    "/v1/key/workspace/events": {
      get: {
        security: [{ ApiKeyAuth: [] }],
        summary: "List workspace events",
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "action", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "actorId", in: "query", schema: { type: "string" } },
          { name: "actorEmail", in: "query", schema: { type: "string" } },
          { name: "projectId", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500 } },
        ],
        responses: {
          "200": { description: "Paginated events" },
        },
      },
      post: {
        security: [{ ApiKeyAuth: [] }],
        summary: "Ingest workspace event",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/IngestEvent" },
            },
          },
        },
        responses: {
          "201": { description: "Event created" },
          "402": { description: "Billing enforcement" },
          "429": { description: "Rate limited" },
        },
      },
    },
  },
});

export type OpenAPIDocument = ReturnType<typeof buildOpenApiDocument>;

