import * as crypto from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
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
    GdprRequestStatus,
    InternalUserRole
} from '@prisma/client';

import { env } from '@/config/env';
import { hashApiKey } from '@/lib/apiKeyAuth';
import { computeEventHash } from '@/lib/hashchain';

const pool = new Pool({ connectionString: env.DATABASE_URL });
// Handle pool errors to prevent unhandled error events
pool.on('error', (err) => {
    // Only log if not already shutting down
    if (!pool.ending) {
        console.error('⚠️  Pool error (non-fatal):', err.message);
    }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const randomKey = () => `hlk_${crypto.randomBytes(24).toString('hex')}`;
const keyPrefix = (raw: string) => raw.slice(0, 12);
const randomSecret = () => crypto.randomBytes(32).toString('hex');

// Generate a random password (12 characters, alphanumeric + special chars)
const generatePassword = (): string => {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// Hash password using Argon2
const hashPassword = async (password: string): Promise<string> => {
    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3, // 3 iterations
        parallelism: 4 // 4 threads
    });
};

// Store user credentials for output
interface UserCredential {
    email: string;
    password: string;
    name: string;
    role: string;
    company?: string;
    workspace?: string;
    type: 'customer' | 'internal';
}

const userCredentials: UserCredential[] = [];

const now = new Date();
const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

async function main() {
    console.log('🌱 Seeding HyreLog Phase 3 & 4 test data...\n');

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
    await prisma.eventSchema.deleteMany(); // Phase 4: Schema Registry
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
    await prisma.account.deleteMany(); // Better-Auth accounts
    await prisma.session.deleteMany(); // Better-Auth sessions
    await prisma.verification.deleteMany(); // Better-Auth verifications
    await prisma.user.deleteMany();
    await prisma.auditLog.deleteMany(); // Internal admin audit logs
    await prisma.internalUser.deleteMany(); // Internal admin users
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
    // 2.5. CREATE TEST USERS WITH PASSWORDS
    // ============================================
    console.log('👥 Creating test users with passwords...');

    // Create test users for Acme Corp with different roles
    const acmeOwnerPassword = generatePassword();
    const hashedAcmeOwnerPassword = await hashPassword(acmeOwnerPassword);
    const acmeOwner = await prisma.user.create({
        data: {
            email: 'owner@acme.com',
            name: 'Acme Owner',
            isVerified: true,
            onboardingState: 'completed',
            emailVerified: true // Better-Auth field
        }
    });
    // Create Better-Auth Account record
    await prisma.account.create({
        data: {
            accountId: acmeOwner.email,
            providerId: 'credential',
            userId: acmeOwner.id,
            password: hashedAcmeOwnerPassword
        }
    });
    await prisma.companyUser.create({
        data: {
            companyId: acmeCorp.id,
            userId: acmeOwner.id,
            role: 'owner',
            onboardingStep: 'COMPLETE'
        }
    });
    userCredentials.push({
        email: 'owner@acme.com',
        password: acmeOwnerPassword,
        name: 'Acme Owner',
        role: 'OWNER',
        company: 'Acme Corp',
        type: 'customer'
    });

    const acmeAdminPassword = generatePassword();
    const hashedAcmeAdminPassword = await hashPassword(acmeAdminPassword);
    const acmeAdmin = await prisma.user.create({
        data: {
            email: 'admin@acme.com',
            name: 'Acme Admin',
            isVerified: true,
            onboardingState: 'completed',
            emailVerified: true
        }
    });
    await prisma.account.create({
        data: {
            accountId: acmeAdmin.email,
            providerId: 'credential',
            userId: acmeAdmin.id,
            password: hashedAcmeAdminPassword
        }
    });
    await prisma.companyUser.create({
        data: {
            companyId: acmeCorp.id,
            userId: acmeAdmin.id,
            role: 'admin',
            onboardingStep: 'COMPLETE'
        }
    });
    userCredentials.push({
        email: 'admin@acme.com',
        password: acmeAdminPassword,
        name: 'Acme Admin',
        role: 'ADMIN',
        company: 'Acme Corp',
        type: 'customer'
    });

    const acmeMemberPassword = generatePassword();
    const hashedAcmeMemberPassword = await hashPassword(acmeMemberPassword);
    const acmeMember = await prisma.user.create({
        data: {
            email: 'member@acme.com',
            name: 'Acme Member',
            isVerified: true,
            onboardingState: 'completed',
            emailVerified: true
        }
    });
    await prisma.account.create({
        data: {
            accountId: acmeMember.email,
            providerId: 'credential',
            userId: acmeMember.id,
            password: hashedAcmeMemberPassword
        }
    });
    await prisma.companyUser.create({
        data: {
            companyId: acmeCorp.id,
            userId: acmeMember.id,
            role: 'member',
            onboardingStep: 'COMPLETE'
        }
    });
    userCredentials.push({
        email: 'member@acme.com',
        password: acmeMemberPassword,
        name: 'Acme Member',
        role: 'MEMBER',
        company: 'Acme Corp',
        type: 'customer'
    });

    const acmeViewerPassword = generatePassword();
    const hashedAcmeViewerPassword = await hashPassword(acmeViewerPassword);
    const acmeViewer = await prisma.user.create({
        data: {
            email: 'viewer@acme.com',
            name: 'Acme Viewer',
            isVerified: true,
            onboardingState: 'completed',
            emailVerified: true
        }
    });
    await prisma.account.create({
        data: {
            accountId: acmeViewer.email,
            providerId: 'credential',
            userId: acmeViewer.id,
            password: hashedAcmeViewerPassword
        }
    });
    await prisma.companyUser.create({
        data: {
            companyId: acmeCorp.id,
            userId: acmeViewer.id,
            role: 'viewer',
            onboardingStep: 'COMPLETE'
        }
    });
    userCredentials.push({
        email: 'viewer@acme.com',
        password: acmeViewerPassword,
        name: 'Acme Viewer',
        role: 'VIEWER',
        company: 'Acme Corp',
        type: 'customer'
    });

    // Create test users for GlobalTech EU
    const globalTechOwnerPassword = generatePassword();
    const hashedGlobalTechOwnerPassword = await hashPassword(
        globalTechOwnerPassword
    );
    const globalTechOwner = await prisma.user.create({
        data: {
            email: 'owner@globaltech.com',
            name: 'GlobalTech Owner',
            isVerified: true,
            onboardingState: 'completed',
            emailVerified: true
        }
    });
    await prisma.account.create({
        data: {
            accountId: globalTechOwner.email,
            providerId: 'credential',
            userId: globalTechOwner.id,
            password: hashedGlobalTechOwnerPassword
        }
    });
    await prisma.companyUser.create({
        data: {
            companyId: globalTech.id,
            userId: globalTechOwner.id,
            role: 'owner',
            onboardingStep: 'COMPLETE'
        }
    });
    userCredentials.push({
        email: 'owner@globaltech.com',
        password: globalTechOwnerPassword,
        name: 'GlobalTech Owner',
        role: 'OWNER',
        company: 'GlobalTech EU',
        type: 'customer'
    });

    const globalTechAdminPassword = generatePassword();
    const hashedGlobalTechAdminPassword = await hashPassword(
        globalTechAdminPassword
    );
    const globalTechAdmin = await prisma.user.create({
        data: {
            email: 'admin@globaltech.com',
            name: 'GlobalTech Admin',
            isVerified: true,
            onboardingState: 'completed',
            emailVerified: true
        }
    });
    await prisma.account.create({
        data: {
            accountId: globalTechAdmin.email,
            providerId: 'credential',
            userId: globalTechAdmin.id,
            password: hashedGlobalTechAdminPassword
        }
    });
    await prisma.companyUser.create({
        data: {
            companyId: globalTech.id,
            userId: globalTechAdmin.id,
            role: 'admin',
            onboardingStep: 'COMPLETE'
        }
    });
    userCredentials.push({
        email: 'admin@globaltech.com',
        password: globalTechAdminPassword,
        name: 'GlobalTech Admin',
        role: 'ADMIN',
        company: 'GlobalTech EU',
        type: 'customer'
    });

    const globalTechMemberPassword = generatePassword();
    const hashedGlobalTechMemberPassword = await hashPassword(
        globalTechMemberPassword
    );
    const globalTechMember = await prisma.user.create({
        data: {
            email: 'member@globaltech.com',
            name: 'GlobalTech Member',
            isVerified: true,
            onboardingState: 'completed',
            emailVerified: true
        }
    });
    await prisma.account.create({
        data: {
            accountId: globalTechMember.email,
            providerId: 'credential',
            userId: globalTechMember.id,
            password: hashedGlobalTechMemberPassword
        }
    });
    await prisma.companyUser.create({
        data: {
            companyId: globalTech.id,
            userId: globalTechMember.id,
            role: 'member',
            onboardingStep: 'COMPLETE'
        }
    });
    userCredentials.push({
        email: 'member@globaltech.com',
        password: globalTechMemberPassword,
        name: 'GlobalTech Member',
        role: 'MEMBER',
        company: 'GlobalTech EU',
        type: 'customer'
    });

    console.log(`✅ Created ${userCredentials.length} test users\n`);

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
    // 4.5. CREATE WORKSPACE USERS
    // ============================================
    console.log('👥 Assigning users to workspaces...');

    // Assign Acme users to workspaces
    await prisma.workspaceUser.create({
        data: {
            workspaceId: acmeWorkspaces[0]!.id,
            companyId: acmeCorp.id,
            userId: acmeOwner.id,
            role: 'owner'
        }
    });
    await prisma.workspaceUser.create({
        data: {
            workspaceId: acmeWorkspaces[0]!.id,
            companyId: acmeCorp.id,
            userId: acmeAdmin.id,
            role: 'admin'
        }
    });
    await prisma.workspaceUser.create({
        data: {
            workspaceId: acmeWorkspaces[0]!.id,
            companyId: acmeCorp.id,
            userId: acmeMember.id,
            role: 'member'
        }
    });
    await prisma.workspaceUser.create({
        data: {
            workspaceId: acmeWorkspaces[1]!.id,
            companyId: acmeCorp.id,
            userId: acmeOwner.id,
            role: 'owner'
        }
    });
    await prisma.workspaceUser.create({
        data: {
            workspaceId: acmeWorkspaces[1]!.id,
            companyId: acmeCorp.id,
            userId: acmeAdmin.id,
            role: 'admin'
        }
    });

    // Assign GlobalTech users to workspace
    await prisma.workspaceUser.create({
        data: {
            workspaceId: globalTechWorkspaces[0]!.id,
            companyId: globalTech.id,
            userId: globalTechOwner.id,
            role: 'owner'
        }
    });
    await prisma.workspaceUser.create({
        data: {
            workspaceId: globalTechWorkspaces[0]!.id,
            companyId: globalTech.id,
            userId: globalTechAdmin.id,
            role: 'admin'
        }
    });
    await prisma.workspaceUser.create({
        data: {
            workspaceId: globalTechWorkspaces[0]!.id,
            companyId: globalTech.id,
            userId: globalTechMember.id,
            role: 'member'
        }
    });

    console.log('✅ Assigned users to workspaces\n');

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
    // 13. EVENT SCHEMAS (Phase 4: Schema Registry)
    // ============================================
    console.log('📋 Creating event schemas...');

    // Find workspace_1 (Core App) - has strict template
    const coreAppWorkspace = allWorkspaces.find((w) => w.slug === 'core-app');
    if (coreAppWorkspace) {
        // Schema for user.created event
        await prisma.eventSchema.upsert({
            where: {
                workspaceId_eventType_version: {
                    workspaceId: coreAppWorkspace.id,
                    eventType: 'user.created',
                    version: 1
                }
            },
            update: {},
            create: {
                workspaceId: coreAppWorkspace.id,
                eventType: 'user.created',
                description: 'Schema for user creation events',
                jsonSchema: {
                    type: 'object',
                    required: ['action', 'category', 'actor', 'payload'],
                    properties: {
                        action: { type: 'string', const: 'user.created' },
                        category: { type: 'string', enum: ['auth', 'billing'] },
                        actor: {
                            type: 'object',
                            required: ['id', 'email', 'name'],
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string', format: 'email' },
                                name: { type: 'string' }
                            }
                        },
                        payload: {
                            type: 'object',
                            required: ['userId'],
                            properties: {
                                userId: { type: 'string' },
                                email: { type: 'string', format: 'email' }
                            }
                        },
                        metadata: {
                            type: 'object',
                            required: ['source'],
                            properties: {
                                source: { type: 'string' }
                            }
                        },
                        projectId: { type: 'string' }
                    }
                },
                version: 1,
                isActive: true
            }
        });

        // Schema for user.updated event
        await prisma.eventSchema.upsert({
            where: {
                workspaceId_eventType_version: {
                    workspaceId: coreAppWorkspace.id,
                    eventType: 'user.updated',
                    version: 1
                }
            },
            update: {},
            create: {
                workspaceId: coreAppWorkspace.id,
                eventType: 'user.updated',
                description: 'Schema for user update events',
                jsonSchema: {
                    type: 'object',
                    required: [
                        'action',
                        'category',
                        'actor',
                        'payload',
                        'changes'
                    ],
                    properties: {
                        action: { type: 'string', const: 'user.updated' },
                        category: { type: 'string', enum: ['auth', 'billing'] },
                        actor: {
                            type: 'object',
                            required: ['id', 'email', 'name'],
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string', format: 'email' },
                                name: { type: 'string' }
                            }
                        },
                        payload: {
                            type: 'object',
                            required: ['userId'],
                            properties: {
                                userId: { type: 'string' }
                            }
                        },
                        changes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['field', 'old', 'new'],
                                properties: {
                                    field: { type: 'string' },
                                    old: {},
                                    new: {}
                                }
                            }
                        },
                        metadata: {
                            type: 'object',
                            required: ['source'],
                            properties: {
                                source: { type: 'string' }
                            }
                        },
                        projectId: { type: 'string' }
                    }
                },
                version: 1,
                isActive: true
            }
        });
    }

    // Find workspace_2 (Data Platform) - no strict template, but add a schema anyway
    const dataPlatformWorkspace = allWorkspaces.find(
        (w) => w.slug === 'data-platform'
    );
    if (dataPlatformWorkspace) {
        // Schema for data.processed event
        await prisma.eventSchema.upsert({
            where: {
                workspaceId_eventType_version: {
                    workspaceId: dataPlatformWorkspace.id,
                    eventType: 'data.processed',
                    version: 1
                }
            },
            update: {},
            create: {
                workspaceId: dataPlatformWorkspace.id,
                eventType: 'data.processed',
                description: 'Schema for data processing events',
                jsonSchema: {
                    type: 'object',
                    required: ['action', 'category', 'payload'],
                    properties: {
                        action: { type: 'string', const: 'data.processed' },
                        category: { type: 'string' },
                        payload: {
                            type: 'object',
                            required: ['datasetId', 'recordCount'],
                            properties: {
                                datasetId: { type: 'string' },
                                recordCount: { type: 'number', minimum: 0 },
                                processingTime: { type: 'number' }
                            }
                        },
                        metadata: {
                            type: 'object',
                            properties: {
                                pipeline: { type: 'string' },
                                version: { type: 'string' }
                            }
                        }
                    }
                },
                version: 1,
                isActive: true
            }
        });
    }

    console.log('✅ Created event schemas\n');

    // ============================================
    // 14. INTERNAL ADMIN USER
    // ============================================
    console.log('🔐 Creating internal admin user...');

    const internalAdminPassword = generatePassword();
    const hashedInternalPassword = await hashPassword(internalAdminPassword);

    const internalAdmin = await prisma.internalUser.upsert({
        where: { email: 'mark@hyrelog.com' },
        update: {
            password: hashedInternalPassword,
            name: 'Mark Admin',
            role: InternalUserRole.SUPER_ADMIN
        },
        create: {
            email: 'mark@hyrelog.com',
            password: hashedInternalPassword,
            name: 'Mark Admin',
            role: InternalUserRole.SUPER_ADMIN
        }
    });

    userCredentials.push({
        email: 'mark@hyrelog.com',
        password: internalAdminPassword,
        name: 'Mark Admin',
        role: 'SUPER_ADMIN',
        type: 'internal'
    });

    console.log('✅ Created internal admin user\n');

    // ============================================
    // 15. GDPR REQUESTS (Phase 3)
    // ============================================
    console.log('🔒 Creating sample GDPR requests...');

    // Create a test user for GDPR requests
    const testUser = await prisma.user.upsert({
        where: { email: 'gdpr-admin@example.com' },
        update: {},
        create: {
            email: 'gdpr-admin@example.com',
            name: 'GDPR Admin',
            isVerified: true
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

    console.log('\n👥 User Credentials (SAVE THESE PASSWORDS!):');
    console.log('='.repeat(80));
    console.log('\n📧 Customer Users:');
    console.table(
        userCredentials
            .filter((u) => u.type === 'customer')
            .map((u) => ({
                Email: u.email,
                Password: u.password,
                Name: u.name,
                Role: u.role,
                Company: u.company
            }))
    );
    console.log('\n🔐 Internal Admin User:');
    console.table(
        userCredentials
            .filter((u) => u.type === 'internal')
            .map((u) => ({
                Email: u.email,
                Password: u.password,
                Name: u.name,
                Role: u.role
            }))
    );
    console.log(
        '\n⚠️  IMPORTANT: These passwords are randomly generated and shown only once!'
    );
    console.log('⚠️  Save them securely - they will not be displayed again.');
    console.log(
        '\n📝 NOTE: Customer user passwords need to be set through Better-Auth.'
    );
    console.log(
        '   You can sign up with these emails and use the generated passwords,'
    );
    console.log(
        "   or create accounts programmatically through Better-Auth's API."
    );
    console.log(
        '   Internal admin user (mark@hyrelog.com) password is already set.\n'
    );

    console.log('\n💡 Next Steps:');
    console.log('   1. Test API endpoints with the API keys above');
    console.log('   2. Login to dashboard with the user credentials above');
    console.log(
        '   3. Test internal admin portal at /internal/login with mark@hyrelog.com'
    );
    console.log(
        '   4. Run archival job: npm run worker (or wait for cron at 4 AM)'
    );
    console.log(
        '   5. Test archive export: GET /v1/key/company/export-archive.json'
    );
    console.log('   6. Run webhook worker: npm run worker:webhook');
    console.log('   7. Test export endpoints');
    console.log('   8. Test SSE tailing endpoint');
    console.log('\n📦 Archival Testing:');
    console.log(
        `   - ${oldEvents.length} events are marked as archival candidates`
    );
    console.log(
        `   - These events are 400-450 days old (older than 365 day retention)`
    );
    console.log(`   - Run the archival job to archive them to S3`);
    console.log(`   - Then test the export-archive endpoint to retrieve them`);
    console.log('\n📋 Schema Registry (Phase 4):');
    console.log('   - Event schemas created for workspace_1 (Core App)');
    console.log('   - Event schemas created for workspace_2 (Data Platform)');
    console.log('   - Test schema validation with: hyrelog schema pull');
    console.log(
        '   - Test schema push with: hyrelog schema push <schema.json>'
    );
    console.log('\n');
}

main()
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        try {
            // Disconnect Prisma first
            await prisma.$disconnect();
        } catch (error) {
            // Ignore disconnect errors - may already be disconnected
        }

        try {
            // Close pool gracefully
            await pool.end();
        } catch (error) {
            // Ignore pool end errors - connections may already be closed
            // This is common when the database terminates connections
        }

        // Give Node.js event loop a moment to process any pending events
        // This helps prevent "unhandled error event" warnings
        await new Promise((resolve) => setTimeout(resolve, 100));
    });
