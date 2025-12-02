/**
 * Schema Registry endpoints for workspaces
 * Phase 4: Event Schema Registry
 */

import type { FastifyPluginAsync } from "fastify";
import { ApiKeyType } from "@prisma/client";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";
import Ajv from "ajv";

const ajv = new Ajv({ allErrors: true });

const createSchemaSchema = z.object({
  eventType: z.string().min(1),
  description: z.string().optional(),
  jsonSchema: z.record(z.unknown()),
  version: z.number().int().positive().optional().default(1),
});

const updateSchemaSchema = z.object({
  description: z.string().optional(),
  jsonSchema: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export const keyWorkspaceSchemasRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Create a new event schema
   * POST /v1/key/workspace/schemas
   */
  app.post("/v1/key/workspace/schemas", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.WORKSPACE] });

    const body = createSchemaSchema.parse(request.body);

    // Validate JSON Schema
    try {
      ajv.compile(body.jsonSchema);
    } catch (error) {
      throw reply.badRequest(`Invalid JSON Schema: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check if schema already exists for this eventType and version
    const existing = await prisma.eventSchema.findUnique({
      where: {
        workspaceId_eventType_version: {
          workspaceId: ctx.workspace.id,
          eventType: body.eventType,
          version: body.version,
        },
      },
    });

    if (existing) {
      throw reply.conflict(`Schema for eventType "${body.eventType}" version ${body.version} already exists`);
    }

    // Deactivate previous versions if this is a new version
    if (body.version > 1) {
      await prisma.eventSchema.updateMany({
        where: {
          workspaceId: ctx.workspace.id,
          eventType: body.eventType,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    const schema = await prisma.eventSchema.create({
      data: {
        workspaceId: ctx.workspace.id,
        eventType: body.eventType,
        description: body.description,
        jsonSchema: body.jsonSchema,
        version: body.version,
        isActive: true,
      },
    });

    return schema;
  });

  /**
   * List all schemas for a workspace
   * GET /v1/key/workspace/schemas
   */
  app.get("/v1/key/workspace/schemas", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.WORKSPACE] });

    const query = z
      .object({
        eventType: z.string().optional(),
        isActive: z.string().transform((val) => val === "true").optional(),
      })
      .parse(request.query);

    const schemas = await prisma.eventSchema.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        ...(query.eventType ? { eventType: query.eventType } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      orderBy: [
        { eventType: "asc" },
        { version: "desc" },
      ],
    });

    return { schemas };
  });

  /**
   * Get a specific schema
   * GET /v1/key/workspace/schemas/:schemaId
   */
  app.get("/v1/key/workspace/schemas/:schemaId", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.WORKSPACE] });

    const params = z.object({ schemaId: z.string() }).parse(request.params);

    const schema = await prisma.eventSchema.findFirst({
      where: {
        id: params.schemaId,
        workspaceId: ctx.workspace.id,
      },
    });

    if (!schema) {
      throw reply.notFound("Schema not found");
    }

    return schema;
  });

  /**
   * Update a schema
   * PUT /v1/key/workspace/schemas/:schemaId
   */
  app.put("/v1/key/workspace/schemas/:schemaId", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.WORKSPACE] });

    const params = z.object({ schemaId: z.string() }).parse(request.params);
    const body = updateSchemaSchema.parse(request.body);

    const existing = await prisma.eventSchema.findFirst({
      where: {
        id: params.schemaId,
        workspaceId: ctx.workspace.id,
      },
    });

    if (!existing) {
      throw reply.notFound("Schema not found");
    }

    // Validate JSON Schema if provided
    if (body.jsonSchema) {
      try {
        ajv.compile(body.jsonSchema);
      } catch (error) {
        throw reply.badRequest(`Invalid JSON Schema: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const schema = await prisma.eventSchema.update({
      where: { id: params.schemaId },
      data: {
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.jsonSchema ? { jsonSchema: body.jsonSchema } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return schema;
  });

  /**
   * Delete a schema
   * DELETE /v1/key/workspace/schemas/:schemaId
   */
  app.delete("/v1/key/workspace/schemas/:schemaId", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.WORKSPACE] });

    const params = z.object({ schemaId: z.string() }).parse(request.params);

    const existing = await prisma.eventSchema.findFirst({
      where: {
        id: params.schemaId,
        workspaceId: ctx.workspace.id,
      },
    });

    if (!existing) {
      throw reply.notFound("Schema not found");
    }

    await prisma.eventSchema.delete({
      where: { id: params.schemaId },
    });

    return { success: true };
  });
};

