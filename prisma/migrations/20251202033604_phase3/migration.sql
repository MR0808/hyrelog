/*
  Warnings:

  - The `dataRegion` column on the `Company` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Region" AS ENUM ('AU', 'US', 'EU', 'APAC');

-- CreateEnum
CREATE TYPE "GdprRequestType" AS ENUM ('DELETE', 'ANONYMIZE');

-- CreateEnum
CREATE TYPE "GdprRequestStatus" AS ENUM ('CUSTOMER_PENDING', 'CUSTOMER_APPROVED', 'ADMIN_PENDING', 'ADMIN_APPROVED', 'PROCESSING', 'DONE', 'REJECTED');

-- CreateEnum
CREATE TYPE "GdprApprovalType" AS ENUM ('CUSTOMER_APPROVAL', 'ADMIN_APPROVAL');

-- AlterEnum
ALTER TYPE "DataRegion" ADD VALUE 'AU';

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "coldArchiveKey" TEXT,
ADD COLUMN     "isColdArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isWarmArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "replicateTo" "Region"[],
DROP COLUMN "dataRegion",
ADD COLUMN     "dataRegion" "Region" NOT NULL DEFAULT 'AU';

-- CreateTable
CREATE TABLE "RegionDataStore" (
    "id" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "dbUrl" TEXT NOT NULL,
    "readOnlyUrl" TEXT,
    "coldStorageProvider" TEXT NOT NULL,
    "coldStorageBucket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegionDataStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalEventIndex" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "dataRegion" "Region" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalEventIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GdprRequest" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "actorEmail" TEXT,
    "actorId" TEXT,
    "requestType" "GdprRequestType" NOT NULL,
    "status" "GdprRequestStatus" NOT NULL DEFAULT 'CUSTOMER_PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GdprRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GdprRequestApproval" (
    "id" TEXT NOT NULL,
    "gdprRequestId" TEXT NOT NULL,
    "approvedByUserId" TEXT NOT NULL,
    "approvalType" "GdprApprovalType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GdprRequestApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingWrite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "eventData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingWrite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegionDataStore_region_key" ON "RegionDataStore"("region");

-- CreateIndex
CREATE INDEX "GlobalEventIndex_companyId_occurredAt_idx" ON "GlobalEventIndex"("companyId", "occurredAt");

-- CreateIndex
CREATE INDEX "GlobalEventIndex_dataRegion_occurredAt_idx" ON "GlobalEventIndex"("dataRegion", "occurredAt");

-- CreateIndex
CREATE INDEX "GlobalEventIndex_workspaceId_occurredAt_idx" ON "GlobalEventIndex"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "GlobalEventIndex_actorEmail_occurredAt_idx" ON "GlobalEventIndex"("actorEmail", "occurredAt");

-- CreateIndex
CREATE INDEX "GlobalEventIndex_actorId_occurredAt_idx" ON "GlobalEventIndex"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "GdprRequest_companyId_status_idx" ON "GdprRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "GdprRequest_status_createdAt_idx" ON "GdprRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GdprRequestApproval_gdprRequestId_idx" ON "GdprRequestApproval"("gdprRequestId");

-- CreateIndex
CREATE INDEX "PendingWrite_region_createdAt_idx" ON "PendingWrite"("region", "createdAt");

-- CreateIndex
CREATE INDEX "PendingWrite_companyId_createdAt_idx" ON "PendingWrite"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_isColdArchived_createdAt_idx" ON "AuditEvent"("isColdArchived", "createdAt");

-- AddForeignKey
ALTER TABLE "GlobalEventIndex" ADD CONSTRAINT "GlobalEventIndex_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdprRequest" ADD CONSTRAINT "GdprRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GdprRequestApproval" ADD CONSTRAINT "GdprRequestApproval_gdprRequestId_fkey" FOREIGN KEY ("gdprRequestId") REFERENCES "GdprRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingWrite" ADD CONSTRAINT "PendingWrite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
