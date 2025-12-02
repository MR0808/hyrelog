import crypto from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    ApiKeyType,
    BillingCycle,
    BillingMeterType,
    DataRegion,
    Region,
    PrismaClient,
    WebhookDeliveryStatus,
    ThresholdType,
    GdprRequestType,
    GdprRequestStatus
} from '@prisma/client';

import { env } from '@/config/env';
import { hashApiKey } from '@/lib/apiKeyAuth';
import { computeEventHash } from '@/lib/hashchain';

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const randomKey = () => `hlk_${crypto.randomBytes(24).toString('hex')}`;
const keyPrefix = (raw: string) => raw.slice(0, 12);
const randomSecret = () => crypto.randomBytes(32).toString('hex');

const now = new Date();
const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

async function main() {
    console.log('🌱 Seeding HyreLog Phase 3 test data...\n');

    // ============================================
    // 0. CLEANUP - Delete all existing data
    // ============================================
    console.log('🧹 Cleaning up existing data...');

    // Delete in order to respect foreign key constraints
    await prisma.webhookDelivery.deleteMany();
    await prisma.webhook.deleteMany();
    await prisma.thresholdAlert.deleteMany();
    await prisma.workspaceTemplateAssignment.deleteMany();
    await prisma.workspaceTemplate.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.globalEventIndex.deleteMany();
    await prisma.pendingWrite.deleteMany();
    await prisma.gdprRequestApproval.deleteMany();
    await prisma.gdprRequest.deleteMany();
    await prisma.apiKeyLog.deleteMany();
    await prisma.apiKey.deleteMany();
    await prisma.usageStats.deleteMany();
    await prisma.billingMeter.deleteMany();
    await prisma.companyAddOn.deleteMany();
    await prisma.companyPlan.deleteMany();
    await prisma.project.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.company.deleteMany();
    await prisma.workspaceUser.deleteMany();
    await prisma.companyUser.deleteMany();
    await prisma.user.deleteMany();
    await prisma.job.deleteMany();
    // Note: RegionDataStore is not deleted - it's configuration data

    console.log('✅ Cleanup complete\n');

    // ============================================
    // 1. REGION DATA STORE (Phase 3)
    // ============================================
    console.log('🌍 Creating region data stores...');

    // Create AU region (primary region)
    await prisma.regionDataStore.upsert({
        where: { region: Region.AU },
        update: {},
        create: {
            region: Region.AU,
            dbUrl: env.DATABASE_URL, // Use same DB for now (AU-first)
            readOnlyUrl: null,
            coldStorageProvider: 'aws',
            coldStorageBucket: env.AWS_S3_BUCKET || 'hyrelog-archives-prod'
        }
    });

    console.log('✅ Created region data store (AU)\n');

    // ============================================
    // 2. PLANS & ADD-ONS
    // ============================================
    console.log('📦 Creating plans and add-ons...');

    const plans = await Promise.all([
        prisma.plan.upsert({
            where: { code: 'free' },
            update: {},
            create: {
                code: 'free',
                name: 'Free',
                description: 'Free tier for small projects',
                monthlyEventLimit: 10_000,
                retentionDays: 30,
                priceCents: 0
            }
        }),
        prisma.plan.upsert({
            where: { code: 'starter' },
            update: {},
            create: {
                code: 'starter',
                name: 'Starter',
                description: 'Perfect for growing teams',
                monthlyEventLimit: 50_000,
                retentionDays: 90,
                priceCents: 2900
            }
        }),
        prisma.plan.upsert({
            where: { code: 'growth' },
            update: {},
            create: {
                code: 'growth',
                name: 'Growth',
                description: 'For scaling businesses',
                monthlyEventLimit: 250_000,
                retentionDays: 180,
                priceCents: 9900
            }
        }),
        prisma.plan.upsert({
            where: { code: 'enterprise' },
            update: {},
            create: {
                code: 'enterprise',
                name: 'Enterprise',
                description: 'Unlimited events for large organizations',
                monthlyEventLimit: 1_000_000_000,
                retentionDays: 3650,
                priceCents: 24900
            }
        })
    ]);

    const addOn = await prisma.addOn.upsert({
        where: { code: 'RETENTION_S3_ARCHIVE' },
        update: {},
        create: {
            code: 'RETENTION_S3_ARCHIVE',
            name: 'S3 Archival',
            description: 'Infinite retention via S3 archival',
            retentionBoost: 0,
            priceCents: 9900
        }
    });

    console.log(`✅ Created ${plans.length} plans and 1 add-on\n`);

    // ============================================
    // 2. COMPANIES
    // ============================================
    console.log('🏢 Creating companies...');

    const companies = await Promise.all([
        prisma.company.create({
            data: {
                name: 'Acme Corp',
                slug: 'acme-corp',
                retentionDays: 365,
                dataRegion: Region.AU, // Phase 3: AU-first
                replicateTo: [] // No replication by default
            }
        }),
        prisma.company.create({
            data: {
                name: 'GlobalTech EU',
                slug: 'globaltech-eu',
                retentionDays: 180,
                dataRegion: Region.AU, // Phase 3: AU-first
                replicateTo: [] // No replication by default
            }
        })
    ]);

    const acmeCorp = companies[0]!;
    const globalTech = companies[1]!;

    console.log(`✅ Created ${companies.length} companies\n`);

    // ============================================
    // 3. COMPANY PLANS & ADD-ONS
    // ============================================
    console.log('💳 Assigning plans and add-ons...');

    await prisma.companyPlan.create({
        data: {
            companyId: acmeCorp.id,
            planId: plans.find((p) => p.code === 'enterprise')!.id,
            billingCycle: BillingCycle.MONTHLY,
            currentPeriodStart: now,
            currentPeriodEnd: monthFromNow
        }
    });

    await prisma.companyPlan.create({
        data: {
            companyId: globalTech.id,
            planId: plans.find((p) => p.code === 'growth')!.id,
            billingCycle: BillingCycle.MONTHLY,
            currentPeriodStart: now,
            currentPeriodEnd: monthFromNow
        }
    });

    // Add S3 archival add-on to Acme Corp
    await prisma.companyAddOn.create({
        data: {
            companyId: acmeCorp.id,
            addOnId: addOn.id,
            quantity: 1
        }
    });

    console.log('✅ Plans and add-ons assigned\n');

    // ============================================
    // 4. WORKSPACES
    // ============================================
    console.log('📁 Creating workspaces...');

    const acmeWorkspaces = await Promise.all([
        prisma.workspace.create({
            data: {
                companyId: acmeCorp.id,
                name: 'Core App',
                slug: 'core-app',
                retentionDays: 365
            }
        }),
        prisma.workspace.create({
            data: {
                companyId: acmeCorp.id,
                name: 'Data Platform',
                slug: 'data-platform',
                retentionDays: 90
            }
        })
    ]);

    const globalTechWorkspaces = await Promise.all([
        prisma.workspace.create({
            data: {
                companyId: globalTech.id,
                name: 'Main Workspace',
                slug: 'main',
                retentionDays: 180
            }
        })
    ]);

    const allWorkspaces = [...acmeWorkspaces, ...globalTechWorkspaces];

    console.log(`✅ Created ${allWorkspaces.length} workspaces\n`);

    // ============================================
    // 5. PROJECTS
    // ============================================
    console.log('🎯 Creating projects...');

    const projects = await Promise.all([
        prisma.project.create({
            data: {
                companyId: acmeCorp.id,
                workspaceId: acmeWorkspaces[0]!.id,
                name: 'API Service',
                slug: 'api-service'
            }
        }),
        prisma.project.create({
            data: {
                companyId: acmeCorp.id,
                workspaceId: acmeWorkspaces[0]!.id,
                name: 'Frontend',
                slug: 'frontend'
            }
        }),
        prisma.project.create({
            data: {
                companyId: acmeCorp.id,
                workspaceId: acmeWorkspaces[1]!.id,
                name: 'Data Pipeline',
                slug: 'data-pipeline'
            }
        })
    ]);

    console.log(`✅ Created ${projects.length} projects\n`);

    // ============================================
    // 6. BILLING METERS & USAGE STATS
    // ============================================
    console.log('📊 Creating billing meters...');

    const meters = await Promise.all(
        companies.map((company) =>
            prisma.billingMeter.create({
                data: {
                    companyId: company.id,
                    meterType: BillingMeterType.EVENTS,
                    periodStart: now,
                    periodEnd: monthFromNow,
                    limit: company.id === acmeCorp.id ? 1_000_000_000 : 250_000,
                    currentValue: 0
                }
            })
        )
    );

    await prisma.usageStats.createMany({
        data: [
            ...companies.map((company) => ({
                companyId: company.id,
                workspaceId: null,
                periodStart: now,
                periodEnd: monthFromNow,
                eventsIngested: 0,
                eventsQueried: 0
            })),
            ...allWorkspaces.map((workspace) => ({
                companyId: workspace.companyId,
                workspaceId: workspace.id,
                periodStart: now,
                periodEnd: monthFromNow,
                eventsIngested: 0,
                eventsQueried: 0
            }))
        ]
    });

    console.log(`✅ Created ${meters.length} billing meters\n`);

    // ============================================
    // 7. NOTIFICATION THRESHOLDS
    // ============================================
    console.log('🔔 Creating notification thresholds...');

    await prisma.notificationThreshold.createMany({
        data: companies.map((company) => ({
            companyId: company.id,
            meterType: BillingMeterType.EVENTS,
            softLimitPercent: 75,
            hardLimitPercent: 100,
            channel: 'email'
        }))
    });

    console.log('✅ Created notification thresholds\n');

    // ============================================
    // 8. API KEYS
    // ============================================
    console.log('🔑 Creating API keys...');

    const companyRawKey = randomKey();
    const workspaceKeyPairs = allWorkspaces.map((workspace) => ({
        workspace,
        rawKey: randomKey()
    }));

    const companyKey = await prisma.apiKey.create({
        data: {
            companyId: acmeCorp.id,
            name: 'Company Analytics Key',
            prefix: keyPrefix(companyRawKey),
            hashedKey: hashApiKey(companyRawKey),
            type: ApiKeyType.COMPANY,
            readOnly: true
        }
    });

    const workspaceKeys = await Promise.all(
        workspaceKeyPairs.map(({ workspace, rawKey }) =>
            prisma.apiKey.create({
                data: {
                    companyId: workspace.companyId,
                    workspaceId: workspace.id,
                    name: `${workspace.name} RW Key`,
                    prefix: keyPrefix(rawKey),
                    hashedKey: hashApiKey(rawKey),
                    type: ApiKeyType.WORKSPACE,
                    readOnly: false
                }
            })
        )
    );

    console.log(`✅ Created ${1 + workspaceKeys.length} API keys\n`);

    // ============================================
    // 9. WEBHOOKS
    // ============================================
    console.log('🔗 Creating webhooks...');

    const webhooks = await Promise.all([
        // Company-wide webhook
        prisma.webhook.create({
            data: {
                companyId: acmeCorp.id,
                workspaceId: null,
                url: 'https://webhook.site/unique-id-1',
                isActive: true,
                secret: randomSecret()
            }
        }),
        // Workspace-specific webhook
        prisma.webhook.create({
            data: {
                companyId: acmeCorp.id,
                workspaceId: acmeWorkspaces[0]!.id,
                url: 'https://webhook.site/unique-id-2',
                isActive: true,
                secret: randomSecret()
            }
        }),
        // Inactive webhook (for testing)
        prisma.webhook.create({
            data: {
                companyId: acmeCorp.id,
                workspaceId: acmeWorkspaces[1]!.id,
                url: 'https://webhook.site/unique-id-3',
                isActive: false,
                secret: randomSecret()
            }
        })
    ]);

    console.log(`✅ Created ${webhooks.length} webhooks\n`);

    // ============================================
    // 10. WORKSPACE TEMPLATES
    // ============================================
    console.log('📋 Creating workspace templates...');

    const templates = await Promise.all([
        // Global template
        prisma.workspaceTemplate.create({
            data: {
                companyId: null,
                name: 'Standard Audit Template',
                config: {
                    requiredActorFields: ['id', 'email'],
                    requiredMetadataKeys: ['source', 'version'],
                    defaultCategories: ['auth', 'billing', 'user', 'project'],
                    requireProject: false
                }
            }
        }),
        // Company-specific template
        prisma.workspaceTemplate.create({
            data: {
                companyId: acmeCorp.id,
                name: 'Acme Strict Template',
                config: {
                    requiredActorFields: ['id', 'email', 'name'],
                    requiredMetadataKeys: ['source'],
                    defaultCategories: ['auth', 'billing'],
                    requireProject: true,
                    retentionOverride: 730
                }
            }
        })
    ]);

    // Assign template to workspace
    await prisma.workspaceTemplateAssignment.create({
        data: {
            companyId: acmeCorp.id,
            workspaceId: acmeWorkspaces[0]!.id,
            templateId: templates[1]!.id
        }
    });

    console.log(`✅ Created ${templates.length} templates and 1 assignment\n`);

    // ============================================
    // 11. AUDIT EVENTS
    // ============================================
    console.log('📝 Creating audit events...');

    const workspaceHashMap = new Map<string, string | null>();
    allWorkspaces.forEach((ws) => workspaceHashMap.set(ws.id, null));

    const actions = [
        'user.login',
        'user.logout',
        'user.updated',
        'invoice.created',
        'invoice.paid',
        'project.created',
        'project.deleted'
    ] as const;
    const categories = ['auth', 'billing', 'project', 'user'] as const;

    const events = [];

    // Create recent events (last 30 days) - not ready for archival
    for (let i = 0; i < 50; i += 1) {
        const workspace = allWorkspaces[i % allWorkspaces.length]!;
        const prevHash = workspaceHashMap.get(workspace.id) ?? null;
        const createdAt = new Date(now.getTime() - i * 12 * 60 * 60 * 1000); // Spread over 25 days
        const action = actions[i % actions.length]!;
        const category = categories[i % categories.length]!;

        const actorId = `actor-${i % 10}`;
        const actorEmail = `actor${i % 10}@example.com`;
        const actorName = `Actor ${i % 10}`;

        const payload: Record<string, unknown> = { message: `Event #${i + 1}` };
        const changes =
            action === 'user.updated'
                ? [
                      {
                          field: 'name',
                          old: `Old Name ${i}`,
                          new: `New Name ${i}`
                      }
                  ]
                : undefined;
        const metadata = { env: 'seed', source: 'test', version: '1.0' };
        const projectId =
            i % 3 === 0 ? projects[i % projects.length]?.id : null;

        const hash = computeEventHash(
            {
                workspaceId: workspace.id,
                companyId: workspace.companyId,
                projectId: projectId ?? null,
                action,
                category,
                payload,
                metadata,
                actorId,
                actorEmail,
                actorName,
                createdAt
            },
            prevHash
        );

        const event = await prisma.auditEvent.create({
            data: {
                companyId: workspace.companyId,
                workspaceId: workspace.id,
                projectId: projectId ?? null,
                action,
                category,
                actorId,
                actorEmail,
                actorName,
                targetId: `target-${i}`,
                targetType: 'user',
                payload: payload as any,
                metadata: metadata as any,
                changes: changes ? (changes as any) : null,
                hash,
                prevHash,
                traceId: `trace-${i}`,
                dataRegion:
                    workspace.companyId === acmeCorp.id
                        ? DataRegion.US
                        : DataRegion.EU,
                createdAt,
                archived: false,
                archivalCandidate: false // Recent events not ready for archival
            }
        });

        events.push(event);
        workspaceHashMap.set(workspace.id, hash);

        // Create webhook deliveries for some events (to test webhook worker)
        if (i % 5 === 0 && workspace.companyId === acmeCorp.id) {
            const matchingWebhooks = webhooks.filter(
                (w) =>
                    w.companyId === workspace.companyId &&
                    (w.workspaceId === null ||
                        w.workspaceId === workspace.id) &&
                    w.isActive
            );

            if (matchingWebhooks.length > 0) {
                await prisma.webhookDelivery.createMany({
                    data: matchingWebhooks.map((webhook) => ({
                        webhookId: webhook.id,
                        eventId: event.id,
                        status: WebhookDeliveryStatus.PENDING,
                        nextAttemptAt: new Date()
                    }))
                });
            }
        }
    }

    // Create old events (400+ days ago) - ready for archival
    console.log('📝 Creating old events ready for archival...');
    const oldEvents = [];
    for (let i = 0; i < 30; i += 1) {
        const workspace = allWorkspaces[i % allWorkspaces.length]!;
        // Only create old events for Acme Corp (has S3 archival add-on)
        if (workspace.companyId !== acmeCorp.id) continue;

        const prevHash = workspaceHashMap.get(workspace.id) ?? null;
        // Create events from 400-450 days ago (older than 365 day retention)
        const daysAgo = 400 + (i % 50);
        const createdAt = new Date(
            now.getTime() - daysAgo * 24 * 60 * 60 * 1000
        );
        const action = actions[i % actions.length]!;
        const category = categories[i % categories.length]!;

        const actorId = `actor-old-${i}`;
        const actorEmail = `actor-old-${i}@example.com`;
        const actorName = `Old Actor ${i}`;

        const payload: Record<string, unknown> = {
            message: `Old Event #${i + 1}`,
            archived: true
        };
        const changes =
            action === 'user.updated'
                ? [
                      {
                          field: 'name',
                          old: `Old Name ${i}`,
                          new: `New Name ${i}`
                      }
                  ]
                : undefined;
        const metadata = {
            env: 'seed',
            source: 'test',
            version: '1.0',
            archived: true
        };
        const projectId =
            i % 3 === 0 ? projects[i % projects.length]?.id : null;

        const hash = computeEventHash(
            {
                workspaceId: workspace.id,
                companyId: workspace.companyId,
                projectId: projectId ?? null,
                action,
                category,
                payload,
                metadata,
                actorId,
                actorEmail,
                actorName,
                createdAt
            },
            prevHash
        );

        const event = await prisma.auditEvent.create({
            data: {
                companyId: workspace.companyId,
                workspaceId: workspace.id,
                projectId: projectId ?? null,
                action,
                category,
                actorId,
                actorEmail,
                actorName,
                targetId: `target-old-${i}`,
                targetType: 'user',
                payload: payload as any,
                metadata: metadata as any,
                changes: changes ? (changes as any) : null,
                hash,
                prevHash,
                traceId: `trace-old-${i}`,
                dataRegion: DataRegion.US,
                createdAt,
                archived: false,
                archivalCandidate: true // Mark as ready for archival
            }
        });

        oldEvents.push(event);
        workspaceHashMap.set(workspace.id, hash);
    }

    console.log(
        `✅ Created ${oldEvents.length} old events marked for archival\n`
    );

    // Create already archived events (500+ days ago) - already archived
    console.log('📦 Creating already archived events...');
    const archivedEvents = [];
    for (let i = 0; i < 20; i += 1) {
        const workspace = allWorkspaces[i % allWorkspaces.length]!;
        // Only create archived events for Acme Corp (has S3 archival add-on)
        if (workspace.companyId !== acmeCorp.id) continue;

        const prevHash = workspaceHashMap.get(workspace.id) ?? null;
        // Create events from 500-520 days ago
        const daysAgo = 500 + (i % 20);
        const createdAt = new Date(
            now.getTime() - daysAgo * 24 * 60 * 60 * 1000
        );
        const action = actions[i % actions.length]!;
        const category = categories[i % categories.length]!;

        const actorId = `actor-archived-${i}`;
        const actorEmail = `actor-archived-${i}@example.com`;
        const actorName = `Archived Actor ${i}`;

        const payload: Record<string, unknown> = {
            message: `Archived Event #${i + 1}`,
            archived: true
        };
        const metadata = {
            env: 'seed',
            source: 'test',
            version: '1.0',
            archived: true
        };
        const projectId =
            i % 3 === 0 ? projects[i % projects.length]?.id : null;

        const hash = computeEventHash(
            {
                workspaceId: workspace.id,
                companyId: workspace.companyId,
                projectId: projectId ?? null,
                action,
                category,
                payload,
                metadata,
                actorId,
                actorEmail,
                actorName,
                createdAt
            },
            prevHash
        );

        const event = await prisma.auditEvent.create({
            data: {
                companyId: workspace.companyId,
                workspaceId: workspace.id,
                projectId: projectId ?? null,
                action,
                category,
                actorId,
                actorEmail,
                actorName,
                targetId: `target-archived-${i}`,
                targetType: 'user',
                payload: payload as any,
                metadata: metadata as any,
                hash,
                prevHash,
                traceId: `trace-archived-${i}`,
                dataRegion: DataRegion.US,
                createdAt,
                archived: true, // Already archived
                archivalCandidate: false
            }
        });

        archivedEvents.push(event);
        workspaceHashMap.set(workspace.id, hash);
    }

    console.log(
        `✅ Created ${archivedEvents.length} already archived events\n`
    );

    // ============================================
    // 13. GDPR REQUESTS (Phase 3)
    // ============================================
    console.log('🔒 Creating sample GDPR requests...');

    // Create a test user for GDPR requests
    const testUser = await prisma.user.upsert({
        where: { email: 'gdpr-admin@example.com' },
        update: {},
        create: {
            email: 'gdpr-admin@example.com',
            name: 'GDPR Admin'
        }
    });

    // Sample GDPR request: Customer pending
    const gdprRequest1 = await prisma.gdprRequest.create({
        data: {
            companyId: acmeCorp.id,
            requestedByUserId: testUser.id,
            actorEmail: 'user@example.com',
            requestType: GdprRequestType.ANONYMIZE,
            status: GdprRequestStatus.CUSTOMER_PENDING
        }
    });

    // Sample GDPR request: Customer approved, waiting for admin
    const gdprRequest2 = await prisma.gdprRequest.create({
        data: {
            companyId: acmeCorp.id,
            requestedByUserId: testUser.id,
            actorId: 'actor-1',
            requestType: GdprRequestType.DELETE,
            status: GdprRequestStatus.CUSTOMER_APPROVED
        }
    });

    // Add customer approval for request 2
    await prisma.gdprRequestApproval.create({
        data: {
            gdprRequestId: gdprRequest2.id,
            approvedByUserId: testUser.id,
            approvalType: 'CUSTOMER_APPROVAL'
        }
    });

    console.log(`✅ Created ${2} sample GDPR requests\n`);

    // Update billing meter with total ingested events
    const totalEvents =
        events.length + oldEvents.length + archivedEvents.length;
    await prisma.billingMeter.updateMany({
        data: {
            currentValue: totalEvents
        },
        where: {
            companyId: acmeCorp.id
        }
    });

    console.log(
        `✅ Created ${events.length} recent events, ${oldEvents.length} old events (ready for archival), ${archivedEvents.length} archived events\n`
    );

    // ============================================
    // 12. THRESHOLD ALERTS (Sample)
    // ============================================
    console.log('⚠️  Creating sample threshold alerts...');

    await prisma.thresholdAlert.create({
        data: {
            companyId: acmeCorp.id,
            meterType: BillingMeterType.EVENTS,
            thresholdType: ThresholdType.PERCENTAGE,
            thresholdValue: 75,
            currentValue: 80,
            periodStart: now
        }
    });

    console.log('✅ Created sample threshold alert\n');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('='.repeat(60));
    console.log('✅ SEED COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Companies: ${companies.length}`);
    console.log(`   Workspaces: ${allWorkspaces.length}`);
    console.log(`   Projects: ${projects.length}`);
    console.log(`   API Keys: ${1 + workspaceKeys.length}`);
    console.log(`   Webhooks: ${webhooks.length}`);
    console.log(`   Templates: ${templates.length}`);
    console.log(`   Recent Events: ${events.length}`);
    console.log(`   Old Events (archival candidates): ${oldEvents.length}`);
    console.log(`   Archived Events: ${archivedEvents.length}`);
    console.log(
        `   Total Events: ${
            events.length + oldEvents.length + archivedEvents.length
        }`
    );
    console.log(
        `   Webhook Deliveries: ${await prisma.webhookDelivery.count()}`
    );

    console.log('\n🔑 API Keys (save these!):');
    console.table([
        {
            name: companyKey.name,
            type: 'company',
            key: companyRawKey,
            company: 'Acme Corp'
        },
        ...workspaceKeys.map((key, idx) => {
            const pair = workspaceKeyPairs[idx];
            if (!pair) {
                throw new Error('Workspace key pair mismatch');
            }
            const company = companies.find(
                (c) => c.id === pair.workspace.companyId
            );
            return {
                name: key.name,
                type: 'workspace',
                workspace: pair.workspace.slug,
                company: company?.name ?? 'Unknown',
                key: pair.rawKey
            };
        })
    ]);

    console.log('\n🔗 Webhooks:');
    console.table(
        webhooks.map((w) => ({
            id: w.id.slice(0, 8),
            url: w.url,
            workspace: w.workspaceId
                ? allWorkspaces.find((ws) => ws.id === w.workspaceId)?.slug
                : 'company-wide',
            active: w.isActive
        }))
    );

    console.log('\n📋 Templates:');
    console.table(
        templates.map((t) => ({
            name: t.name,
            company: t.companyId
                ? companies.find((c) => c.id === t.companyId)?.name
                : 'Global',
            assigned:
                t.id === templates[1]!.id ? acmeWorkspaces[0]!.slug : 'none'
        }))
    );

    console.log('\n💡 Next Steps:');
    console.log('   1. Test API endpoints with the API keys above');
    console.log(
        '   2. Run archival job: npm run worker (or wait for cron at 4 AM)'
    );
    console.log(
        '   3. Test archive export: GET /v1/key/company/export-archive.json'
    );
    console.log('   4. Run webhook worker: npm run worker:webhook');
    console.log('   5. Test export endpoints');
    console.log('   6. Test SSE tailing endpoint');
    console.log('\n📦 Archival Testing:');
    console.log(
        `   - ${oldEvents.length} events are marked as archival candidates`
    );
    console.log(
        `   - These events are 400-450 days old (older than 365 day retention)`
    );
    console.log(`   - Run the archival job to archive them to S3`);
    console.log(`   - Then test the export-archive endpoint to retrieve them`);
    console.log('\n');
}

main()
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
