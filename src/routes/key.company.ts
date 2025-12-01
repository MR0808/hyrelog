import type { FastifyPluginAsync } from "fastify";
import { ApiKeyType, JobType } from "@prisma/client";

import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";
import { resolvePagination, type PaginationQuery } from "@/lib/pagination";

export const keyCompanyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/key/company", async (request) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });

    const [workspaceCount, plan] = await Promise.all([
      prisma.workspace.count({ where: { companyId: ctx.company.id } }),
      prisma.companyPlan.findUnique({
        where: { companyId: ctx.company.id },
        include: { plan: true },
      }),
    ]);

    return {
      company: {
        id: ctx.company.id,
        name: ctx.company.name,
        slug: ctx.company.slug,
        retentionDays: ctx.company.retentionDays,
      },
      plan: plan
        ? {
            code: plan.plan.code,
            name: plan.plan.name,
            monthlyEventLimit: plan.plan.monthlyEventLimit,
            retentionDays: plan.plan.retentionDays,
            billingCycle: plan.billingCycle,
            currentPeriodStart: plan.currentPeriodStart,
            currentPeriodEnd: plan.currentPeriodEnd,
          }
        : null,
      stats: {
        workspaces: workspaceCount,
      },
    };
  });

  app.get("/v1/key/company/workspaces", async (request) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
    const pagination = resolvePagination(request.query as PaginationQuery);

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where: { companyId: ctx.company.id },
        orderBy: { createdAt: "asc" },
        skip: pagination.offset,
        take: pagination.limit,
        select: {
          id: true,
          name: true,
          slug: true,
          retentionDays: true,
          createdAt: true,
        },
      }),
      prisma.workspace.count({ where: { companyId: ctx.company.id } }),
    ]);

    return {
      data: workspaces,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
      },
    };
  });

  app.get("/v1/key/company/workspaces/:workspaceId", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
    const { workspaceId } = request.params as { workspaceId: string };

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        companyId: ctx.company.id,
      },
    });

    if (!workspace) {
      throw reply.notFound("Workspace not found");
    }

    const [projectCount, eventCount, latestUsage] = await Promise.all([
      prisma.project.count({ where: { workspaceId: workspace.id } }),
      prisma.auditEvent.count({ where: { workspaceId: workspace.id } }),
      prisma.usageStats.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: { periodEnd: "desc" },
      }),
    ]);

    return {
      workspace,
      stats: {
        projects: projectCount,
        events: eventCount,
        latestUsage,
      },
    };
  });

  app.post("/v1/key/company/gdpr/export", async (request) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });

    const job = await prisma.job.create({
      data: {
        companyId: ctx.company.id,
        type: "GDPR_EXPORT",
        status: "PENDING",
        params: {
          scope: "company",
          format: "json",
        },
      },
    });

    return {
      jobId: job.id,
      status: "queued",
      scope: "company",
      companyId: ctx.company.id,
      message: "GDPR export queued for processing",
      createdAt: job.createdAt,
    };
  });

  app.get("/v1/key/company/jobs/:jobId", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
    const { jobId } = request.params as { jobId: string };

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        companyId: ctx.company.id,
      },
    });

    if (!job) {
      throw reply.notFound("Job not found");
    }

    return job;
  });

  app.post("/v1/key/company/gdpr/delete", async (request) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
    return {
      status: "accepted",
      scope: "company",
      companyId: ctx.company.id,
      message: "GDPR delete request accepted",
    };
  });
};

