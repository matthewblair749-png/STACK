-- CreateEnum
CREATE TYPE "EntityKind" AS ENUM ('Task', 'Project', 'Person', 'SyncedMessage', 'SyncedEvent', 'SyncedFile');

-- CreateEnum
CREATE TYPE "InsightLevel" AS ENUM ('Urgent', 'Important', 'Info');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('Open', 'Dismissed');

-- CreateEnum
CREATE TYPE "PendingActionKind" AS ENUM ('CreateTask', 'SendEmail', 'SendSlackMessage');

-- CreateEnum
CREATE TYPE "PendingActionStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Executed', 'Failed');

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "syncError" TEXT;

-- CreateTable
CREATE TABLE "SyncedMessage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "threadExternalId" TEXT,
    "subject" TEXT,
    "fromName" TEXT,
    "fromAddress" TEXT,
    "snippet" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "isUnread" BOOLEAN NOT NULL DEFAULT false,
    "permalink" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "organizer" TEXT,
    "attendees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "permalink" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncedFile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "webUrl" TEXT,
    "ownerName" TEXT,
    "modifiedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromType" "EntityKind" NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" "EntityKind" NOT NULL,
    "toId" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" "InsightLevel" NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "subjectType" "EntityKind",
    "subjectId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "status" "InsightStatus" NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingAction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "PendingActionKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "PendingActionStatus" NOT NULL DEFAULT 'Pending',
    "resultMetadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncedMessage_workspaceId_receivedAt_idx" ON "SyncedMessage"("workspaceId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedMessage_workspaceId_provider_externalId_key" ON "SyncedMessage"("workspaceId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "SyncedEvent_workspaceId_startAt_idx" ON "SyncedEvent"("workspaceId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedEvent_workspaceId_provider_externalId_key" ON "SyncedEvent"("workspaceId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "SyncedFile_workspaceId_modifiedAt_idx" ON "SyncedFile"("workspaceId", "modifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedFile_workspaceId_provider_externalId_key" ON "SyncedFile"("workspaceId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "EntityLink_workspaceId_fromType_fromId_idx" ON "EntityLink"("workspaceId", "fromType", "fromId");

-- CreateIndex
CREATE INDEX "EntityLink_workspaceId_toType_toId_idx" ON "EntityLink"("workspaceId", "toType", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLink_workspaceId_fromType_fromId_toType_toId_relation_key" ON "EntityLink"("workspaceId", "fromType", "fromId", "toType", "toId", "relation");

-- CreateIndex
CREATE INDEX "Insight_workspaceId_userId_status_idx" ON "Insight"("workspaceId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Insight_workspaceId_userId_dedupeKey_key" ON "Insight"("workspaceId", "userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "PendingAction_workspaceId_userId_status_idx" ON "PendingAction"("workspaceId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryItem_workspaceId_userId_key_key" ON "MemoryItem"("workspaceId", "userId", "key");

-- AddForeignKey
ALTER TABLE "SyncedMessage" ADD CONSTRAINT "SyncedMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedMessage" ADD CONSTRAINT "SyncedMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedEvent" ADD CONSTRAINT "SyncedEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedEvent" ADD CONSTRAINT "SyncedEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedFile" ADD CONSTRAINT "SyncedFile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedFile" ADD CONSTRAINT "SyncedFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAction" ADD CONSTRAINT "PendingAction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingAction" ADD CONSTRAINT "PendingAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryItem" ADD CONSTRAINT "MemoryItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryItem" ADD CONSTRAINT "MemoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
