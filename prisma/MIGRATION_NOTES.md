# Migration Notes for Onboarding Schema Changes

## Summary

This migration adds onboarding tracking, billing mode support, and internal admin user management to the HyreLog schema.

## Changes Applied

### 1. New Enums Added
- `BillingMode` (STRIPE, CUSTOM)
- `InvoiceTerm` (NET_30, NET_60, MANUAL)
- `PlanTier` (FREE, STARTER, GROWTH, SCALE, ENTERPRISE)
- `OnboardingStep` (START, COMPANY, PLAN, BILLING, WORKSPACE, API_KEY, SEND_EVENT, COMPLETE)
- `InternalUserRole` (SUPER_ADMIN, SALES_ADMIN, SUPPORT_ADMIN, BILLING_ADMIN)

### 2. User Model Updates
- Added `isVerified Boolean @default(false)`
- Added `onboardingState String?`

### 3. Company Model Updates
- Added `onboardingStep OnboardingStep?`
- Added `billingMode BillingMode @default(STRIPE)`
- Added `planTier PlanTier?`
- Added `customMonthlyPrice Int?`
- Added `customEventLimit Int?`
- Added `customRetentionDays Int?`
- Added `invoiceTerm InvoiceTerm?`
- Added `contractStart DateTime?`
- Added `contractEnd DateTime?`
- Added `crmDealId String?`
- Added `stripeCustomerId String? @unique`
- Added `stripeSubscriptionId String? @unique`
- Added `stripePriceId String?`
- Added indexes: `@@index([billingMode])`, `@@index([planTier])`, `@@index([onboardingStep])`, `@@index([stripeCustomerId])`

### 4. CompanyUser Model Updates
- Added `onboardingStep OnboardingStep?`

### 5. Plan Model Updates
- Added `tier PlanTier?`

### 6. New Models
- `InternalUser` - Separate admin user model
- `AuditLog` - For tracking internal admin actions (impersonation, etc.)

## Migration Steps

1. **Run the migration:**
   ```bash
   npx prisma migrate dev --name add_onboarding_and_billing_fields
   ```

2. **Set default values for existing data:**
   ```sql
   -- Set billingMode to STRIPE for existing companies
   UPDATE "Company" SET "billingMode" = 'STRIPE' WHERE "billingMode" IS NULL;
   
   -- Set onboardingStep to null for existing companies (they've completed onboarding)
   -- (No action needed, null is the default)
   
   -- Set isVerified to true for existing users (they've already signed up)
   UPDATE "User" SET "isVerified" = true WHERE "isVerified" IS NULL;
   ```

3. **Backfill planTier based on existing plans:**
   ```sql
   -- Update Plan.tier based on Plan.code
   UPDATE "Plan" SET "tier" = 'FREE' WHERE "code" = 'FREE';
   UPDATE "Plan" SET "tier" = 'STARTER' WHERE "code" = 'STARTER';
   UPDATE "Plan" SET "tier" = 'GROWTH' WHERE "code" = 'GROWTH';
   UPDATE "Plan" SET "tier" = 'SCALE' WHERE "code" = 'SCALE';
   UPDATE "Plan" SET "tier" = 'ENTERPRISE' WHERE "code" = 'ENTERPRISE';
   ```

4. **Create initial internal admin user (optional):**
   ```typescript
   // Use the hashPassword function from dashboard lib/password.ts
   import { hashPassword } from './lib/password';
   
   const adminPassword = await hashPassword('your-secure-password');
   
   await prisma.internalUser.create({
     data: {
       email: 'admin@hyrelog.com',
       password: adminPassword,
       name: 'Admin User',
       role: 'SUPER_ADMIN',
     },
   });
   ```

## Verification

After migration, verify:
- [ ] All indexes created successfully
- [ ] Default values set correctly
- [ ] Existing companies have `billingMode = 'STRIPE'`
- [ ] Existing users have `isVerified = true`
- [ ] Plan tiers backfilled
- [ ] InternalUser table accessible
- [ ] AuditLog table accessible

## Rollback

If you need to rollback:
```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

Then manually remove the fields from the schema and regenerate.

## Notes

- All new fields are nullable or have defaults, so migration should be safe
- Existing companies will default to STRIPE billing mode
- Existing users will default to `isVerified = false` (update manually if needed)
- InternalUser uses Argon2 password hashing (same as customer users)

