/**
 * Documentation generator for SDKs
 * Phase 4: Documentation Generator
 * 
 * Generates SDK documentation from OpenAPI spec and code
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

interface SDKInfo {
  name: string;
  language: string;
  path: string;
  readme: string;
}

const SDKs: SDKInfo[] = [
  {
    name: "Node.js/TypeScript",
    language: "typescript",
    path: "packages/node-sdk",
    readme: "packages/node-sdk/README.md",
  },
  {
    name: "Python",
    language: "python",
    path: "packages/python-sdk",
    readme: "packages/python-sdk/README.md",
  },
  {
    name: "Go",
    language: "go",
    path: "packages/go-sdk",
    readme: "packages/go-sdk/README.md",
  },
];

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description?: string;
  parameters?: Array<{ name: string; type: string; required: boolean }>;
  requestBody?: { type: string; schema: any };
  responses?: Array<{ status: number; description: string }>;
}

/**
 * Generate SDK documentation index
 */
function generateSDKIndex(): string {
  const sections = SDKs.map((sdk) => {
    const readmePath = path.join(rootDir, sdk.readme);
    const readmeExists = fs.existsSync(readmePath);
    
    return `## ${sdk.name} SDK

${readmeExists ? `See [${sdk.name} SDK README](${sdk.readme})` : "Documentation coming soon"}

**Language**: ${sdk.language}
**Path**: \`${sdk.path}\`

`;
  }).join("\n");

  return `# HyreLog SDKs

Official SDKs for integrating HyreLog into your applications.

${sections}

## Quick Links

- [API Reference](../docs/API.md)
- [Getting Started Guide](../docs/GETTING_STARTED.md)
- [Examples](../examples/)
`;
}

/**
 * Generate API reference from OpenAPI spec
 */
function generateAPIReference(): string {
  // Simplified - in production would parse OpenAPI spec
  const endpoints: Endpoint[] = [
    {
      method: "POST",
      path: "/v1/key/workspace/events",
      summary: "Log a single event",
      description: "Ingest a single audit event",
      requestBody: {
        type: "object",
        schema: {
          action: "string",
          category: "string",
          actor: "object",
          payload: "object",
        },
      },
      responses: [
        { status: 200, description: "Event logged successfully" },
        { status: 400, description: "Invalid request" },
        { status: 401, description: "Unauthorized" },
        { status: 429, description: "Rate limit exceeded" },
      ],
    },
    {
      method: "POST",
      path: "/v1/key/workspace/events/batch",
      summary: "Log multiple events",
      description: "Ingest multiple events in a single request",
      requestBody: {
        type: "object",
        schema: {
          events: "array",
        },
      },
      responses: [
        { status: 200, description: "Events logged successfully" },
      ],
    },
    {
      method: "GET",
      path: "/v1/key/workspace/events",
      summary: "Query events",
      description: "Query events with filters and pagination",
      parameters: [
        { name: "page", type: "number", required: false },
        { name: "limit", type: "number", required: false },
        { name: "action", type: "string", required: false },
        { name: "category", type: "string", required: false },
      ],
      responses: [
        { status: 200, description: "Query results" },
      ],
    },
  ];

  const endpointDocs = endpoints.map((endpoint) => {
    const params = endpoint.parameters
      ?.map((p) => `- \`${p.name}\` (${p.type})${p.required ? " **required**" : ""}`)
      .join("\n") || "";

    const responses = endpoint.responses
      ?.map((r) => `- \`${r.status}\`: ${r.description}`)
      .join("\n") || "";

    return `### ${endpoint.method} ${endpoint.path}

${endpoint.summary}

${endpoint.description || ""}

${params ? `**Parameters:**\n${params}\n` : ""}
${endpoint.requestBody ? `**Request Body:** \`${endpoint.requestBody.type}\`\n` : ""}
${responses ? `**Responses:**\n${responses}\n` : ""}
`;
  }).join("\n");

  return `# HyreLog API Reference

## Authentication

All API requests require an API key in the \`x-hyrelog-key\` header:

\`\`\`
x-hyrelog-key: your-workspace-key
\`\`\`

## Base URL

\`\`\`
https://api.hyrelog.com
\`\`\`

## Endpoints

${endpointDocs}

## Rate Limits

- **Per API Key**: 1200 requests per minute
- **Per IP**: 600 requests per minute

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests allowed
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: ISO timestamp when limit resets
- \`Retry-After\`: Seconds to wait (on 429 responses)

## Error Responses

All errors follow this format:

\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
\`\`\`

## SDKs

Use our official SDKs for easier integration:

- [Node.js/TypeScript SDK](../packages/node-sdk/README.md)
- [Python SDK](../packages/python-sdk/README.md)
- [Go SDK](../packages/go-sdk/README.md)
`;
}

/**
 * Generate code snippets for each SDK
 */
function generateCodeSnippets(): string {
  return `# Code Snippets

## Node.js/TypeScript

\`\`\`typescript
import { HyreLogWorkspaceClient } from "@hyrelog/node";

const client = new HyreLogWorkspaceClient({
  workspaceKey: "your-workspace-key",
});

await client.logEvent({
  action: "user.created",
  category: "auth",
  actor: { id: "user-123", email: "user@example.com" },
  payload: { userId: "user-123" },
});
\`\`\`

## Python

\`\`\`python
from hyrelog import HyreLogWorkspaceClient

client = HyreLogWorkspaceClient(
    workspace_key="your-workspace-key"
)

await client.log_event(
    EventInput(
        action="user.created",
        category="auth",
        actor=Actor(id="user-123", email="user@example.com"),
        payload={"userId": "user-123"},
    )
)
\`\`\`

## Go

\`\`\`go
import "github.com/hyrelog/go-sdk"

client := hyrelog.NewWorkspaceClient(hyrelog.WorkspaceClientConfig{
    WorkspaceKey: "your-workspace-key",
})

event, err := client.LogEvent(ctx, hyrelog.EventInput{
    Action:   "user.created",
    Category: "auth",
    Actor: &hyrelog.Actor{
        ID:    "user-123",
        Email: "user@example.com",
    },
    Payload: map[string]interface{}{
        "userId": "user-123",
    },
})
\`\`\`
`;
}

/**
 * Main generation function
 */
async function generateDocs(): Promise<void> {
  console.log("📚 Generating SDK documentation...");

  const docsDir = path.join(rootDir, "docs");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Generate SDK index
  const sdkIndex = generateSDKIndex();
  fs.writeFileSync(path.join(docsDir, "SDKs.md"), sdkIndex);
  console.log("✅ Generated docs/SDKs.md");

  // Generate API reference
  const apiRef = generateAPIReference();
  fs.writeFileSync(path.join(docsDir, "API.md"), apiRef);
  console.log("✅ Generated docs/API.md");

  // Generate code snippets
  const snippets = generateCodeSnippets();
  fs.writeFileSync(path.join(docsDir, "SNIPPETS.md"), snippets);
  console.log("✅ Generated docs/SNIPPETS.md");

  console.log("\n✨ Documentation generation complete!");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDocs().catch(console.error);
}

export { generateDocs };

