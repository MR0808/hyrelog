import crypto from "node:crypto";

import { ApiKeyType, BillingCycle, BillingMeterType, PrismaClient } from "@prisma/client";

import { hashApiKey } from "@/lib/apiKeyAuth";
import { computeEventHash } from "@/lib/hashchain";

const prisma = new PrismaClient();

const randomKey = () => `hlk_${crypto.randomBytes(24).toString("hex")}`;
const keyPrefix = (raw: string) => raw.slice(0, 12);

const now = new Date();
const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Seeding HyreLog reference data...");

  const plan = await prisma.plan.upsert({
    where: { code: "enterprise" },
    update: {},
    create: {
      code: "enterprise",
      name: "Enterprise",
      monthlyEventLimit: 100_000,
      retentionDays: 180,
      priceCents: 24900,
    },
  });

  const addOn = await prisma.addOn.upsert({
    where: { code: "retention_plus" },
    update: {},
    create: {
      code: "retention_plus",
      name: "Retention+",
      retentionBoost: 90,
      priceCents: 9900,
    },
  });

  const company = await prisma.company.create({
    data: {
      name: "HyreLog Pilot Co",
      slug: "hyrelog-pilot",
      retentionDays: 180,
    },
  });

  const workspaces = await Promise.all(
    ["core-app", "data-platform"].map((slug, index) =>
      prisma.workspace.create({
        data: {
          name: `Workspace ${index + 1}`,
          slug,
          retentionDays: 120,
          companyId: company.id,
        },
      }),
    ),
  );

  if (workspaces.length === 0) {
    throw new Error("Workspace seeding failed");
  }

  const primaryWorkspace = workspaces[0]!;

  const projects = await prisma.project.createMany({
    data: [
      {
        name: "Payments",
        slug: "payments",
        companyId: company.id,
        workspaceId: primaryWorkspace.id,
      },
      {
        name: "Billing",
        slug: "billing",
        companyId: company.id,
        workspaceId: primaryWorkspace.id,
      },
    ],
  });

  console.log(`Created ${projects.count} projects`);

  await prisma.companyPlan.create({
    data: {
      companyId: company.id,
      planId: plan.id,
      billingCycle: BillingCycle.MONTHLY,
      currentPeriodStart: now,
      currentPeriodEnd: monthFromNow,
    },
  });

  await prisma.companyAddOn.create({
    data: {
      companyId: company.id,
      addOnId: addOn.id,
      quantity: 1,
    },
  });

  const meter = await prisma.billingMeter.create({
    data: {
      companyId: company.id,
      meterType: BillingMeterType.EVENTS,
      currentValue: 0,
      limit: 100_000,
      periodStart: now,
      periodEnd: monthFromNow,
    },
  });

  await prisma.notificationThreshold.create({
    data: {
      companyId: company.id,
      meterType: BillingMeterType.EVENTS,
      softLimitPercent: 80,
      hardLimitPercent: 100,
      channel: "email",
    },
  });

  await prisma.usageStats.createMany({
    data: workspaces.map((ws) => ({
      companyId: company.id,
      workspaceId: ws.id,
      periodStart: meter.periodStart,
      periodEnd: meter.periodEnd,
    })),
  });

  const companyRawKey = randomKey();
  const workspaceKeyPairs = workspaces.map((workspace) => ({
    workspace,
    rawKey: randomKey(),
  }));

  const companyKey = await prisma.apiKey.create({
    data: {
      companyId: company.id,
      name: "Company Analytics Key",
      prefix: keyPrefix(companyRawKey),
      hashedKey: hashApiKey(companyRawKey),
      type: ApiKeyType.COMPANY,
      readOnly: true,
    },
  });

  const workspaceKeys = await Promise.all(
    workspaceKeyPairs.map(({ workspace, rawKey }) =>
      prisma.apiKey.create({
        data: {
          companyId: company.id,
          workspaceId: workspace.id,
          name: `${workspace.name} RW Key`,
          prefix: keyPrefix(rawKey),
          hashedKey: hashApiKey(rawKey),
          type: ApiKeyType.WORKSPACE,
          readOnly: false,
        },
      }),
    ),
  );

  const workspaceHashMap = new Map<string, string | null>();
  workspaces.forEach((ws) => workspaceHashMap.set(ws.id, null));

  const actions = ["user.login", "user.logout", "invoice.created", "invoice.paid"] as const;
  const categories = ["auth", "billing", "project"] as const;

  for (let i = 0; i < 60; i += 1) {
    const workspace = workspaces[i % workspaces.length];
    if (!workspace) continue;
    const prevHash = workspaceHashMap.get(workspace.id) ?? null;
    const createdAt = new Date(now.getTime() - i * 60 * 60 * 1000);
    const action = actions[i % actions.length];
    const category = categories[i % categories.length];
    if (!action || !category) continue;

    const hash = computeEventHash(
      {
        workspaceId: workspace.id,
        companyId: company.id,
        projectId: null,
        action,
        category,
        payload: { message: `Event #${i + 1}` },
        metadata: { env: "seed" },
        actorId: `actor-${i % 5}`,
        actorEmail: `actor${i % 5}@example.com`,
        actorName: `Actor ${i % 5}`,
        createdAt,
      },
      prevHash,
    );

    await prisma.auditEvent.create({
      data: {
        companyId: company.id,
        workspaceId: workspace.id,
        action,
        category,
        actorId: `actor-${i % 5}`,
        actorEmail: `actor${i % 5}@example.com`,
        actorName: `Actor ${i % 5}`,
        payload: { message: `Event #${i + 1}` },
        metadata: { env: "seed" },
        hash,
        prevHash,
        createdAt,
      },
    });

    workspaceHashMap.set(workspace.id, hash);
  }

  console.log("Seed complete. API keys:");
  console.table([
    { name: companyKey.name, type: "company", key: companyRawKey },
    ...workspaceKeys.map((key, idx) => {
      const pair = workspaceKeyPairs[idx];
      if (!pair) {
        throw new Error("Workspace key pair mismatch");
      }
      return {
        name: key.name,
        type: "workspace",
        workspace: pair.workspace.slug,
        key: pair.rawKey,
      };
    }),
  ]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

