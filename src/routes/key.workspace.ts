import type { FastifyPluginAsync } from "fastify";
import { ApiKeyType } from "@prisma/client";

import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";

export const keyWorkspaceRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/key/workspace", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.WORKSPACE] });

    if (!ctx.workspace) {
      throw reply.badRequest("Workspace key not linked to a workspace");
    }

    const projects = await prisma.project.findMany({
      where: { workspaceId: ctx.workspace.id },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      workspace: ctx.workspace,
      company: {
        id: ctx.company.id,
        name: ctx.company.name,
        slug: ctx.company.slug,
      },
      projects,
    };
  });
};

