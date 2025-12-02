-- CreateTable
CREATE TABLE "EventSchema" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT,
    "jsonSchema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSchema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSchema_workspaceId_eventType_isActive_idx" ON "EventSchema"("workspaceId", "eventType", "isActive");

-- CreateIndex
CREATE INDEX "EventSchema_workspaceId_isActive_idx" ON "EventSchema"("workspaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EventSchema_workspaceId_eventType_version_key" ON "EventSchema"("workspaceId", "eventType", "version");

-- AddForeignKey
ALTER TABLE "EventSchema" ADD CONSTRAINT "EventSchema_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
