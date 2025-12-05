/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('STRIPE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InvoiceTerm" AS ENUM ('NET_30', 'NET_60', 'MANUAL');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'SCALE', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('START', 'COMPANY', 'PLAN', 'BILLING', 'WORKSPACE', 'API_KEY', 'SEND_EVENT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "InternalUserRole" AS ENUM ('SUPER_ADMIN', 'SALES_ADMIN', 'SUPPORT_ADMIN', 'BILLING_ADMIN');

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "healthScore" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "ipAllowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lastUsedEndpoint" TEXT,
ADD COLUMN     "lastUsedIp" TEXT,
ADD COLUMN     "revokedReason" TEXT,
ADD COLUMN     "rotatedFrom" TEXT,
ADD COLUMN     "rotatedTo" TEXT,
ADD COLUMN     "rotationPolicy" JSONB;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "billingMode" "BillingMode" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "contractEnd" TIMESTAMP(3),
ADD COLUMN     "contractStart" TIMESTAMP(3),
ADD COLUMN     "crmDealId" TEXT,
ADD COLUMN     "customEventLimit" INTEGER,
ADD COLUMN     "customMonthlyPrice" INTEGER,
ADD COLUMN     "customRetentionDays" INTEGER,
ADD COLUMN     "invoiceTerm" "InvoiceTerm",
ADD COLUMN     "onboardingStep" "OnboardingStep",
ADD COLUMN     "planTier" "PlanTier",
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "CompanyUser" ADD COLUMN     "onboardingStep" "OnboardingStep";

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "tier" "PlanTier";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingState" TEXT;

-- CreateTable
CREATE TABLE "InternalUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "InternalUserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "internalUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetCompanyId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalUser_email_key" ON "InternalUser"("email");

-- CreateIndex
CREATE INDEX "InternalUser_email_idx" ON "InternalUser"("email");

-- CreateIndex
CREATE INDEX "InternalUser_role_idx" ON "InternalUser"("role");

-- CreateIndex
CREATE INDEX "AuditLog_internalUserId_createdAt_idx" ON "AuditLog"("internalUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetUserId_createdAt_idx" ON "AuditLog"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetCompanyId_createdAt_idx" ON "AuditLog"("targetCompanyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeSubscriptionId_key" ON "Company"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Company_billingMode_idx" ON "Company"("billingMode");

-- CreateIndex
CREATE INDEX "Company_planTier_idx" ON "Company"("planTier");

-- CreateIndex
CREATE INDEX "Company_onboardingStep_idx" ON "Company"("onboardingStep");

-- CreateIndex
CREATE INDEX "Company_stripeCustomerId_idx" ON "Company"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_internalUserId_fkey" FOREIGN KEY ("internalUserId") REFERENCES "InternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
