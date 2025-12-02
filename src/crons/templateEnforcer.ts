import { prisma } from "@/lib/prisma";

import { getWorkspaceTemplate, validateEventWithTemplate } from "@/lib/templates";

/**
 * Validates events against workspace templates.
 * Runs daily/weekly.
 */
export const runTemplateEnforcer = async (): Promise<void> => {
  const assignments = await prisma.workspaceTemplateAssignment.findMany({
    include: {
      template: true,
      workspace: true,
    },
  });

  for (const assignment of assignments) {
    const template = assignment.template;

    // Sample recent events for validation
    const recentEvents = await prisma.auditEvent.findMany({
      where: {
        workspaceId: assignment.workspaceId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      take: 100,
    });

    const violations: Array<{ eventId: string; errors: string[] }> = [];

    for (const event of recentEvents) {
      const actor: { id?: string; email?: string; name?: string } = {};
      if (event.actorId) actor.id = event.actorId;
      if (event.actorEmail) actor.email = event.actorEmail;
      if (event.actorName) actor.name = event.actorName;

      const input: {
        action: string;
        category: string;
        actor?: { id?: string; email?: string; name?: string } | undefined;
        metadata?: Record<string, unknown> | undefined;
        projectId?: string | undefined;
      } = {
        action: event.action,
        category: event.category,
      };

      if (Object.keys(actor).length > 0) {
        input.actor = actor;
      }
      if (event.metadata) {
        input.metadata = event.metadata as Record<string, unknown>;
      }
      if (event.projectId) {
        input.projectId = event.projectId;
      }

      const validation = validateEventWithTemplate(input, template);

      if (!validation.valid) {
        violations.push({
          eventId: event.id,
          errors: validation.errors,
        });
      }
    }

    if (violations.length > 0) {
      console.warn(
        `Template violations found for workspace ${assignment.workspaceId}:`,
        violations,
      );
      // TODO: Log to ConfigChangeLog or send alert
    }
  }
};

