-- Tasks/issues from Asana, Jira and Linear as structured rows (status, due date) instead of message summaries. Add-only.
-- CreateTable
CREATE TABLE "SyncedTask" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "dueIsDate" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT,
    "container" TEXT,
    "permalink" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncedTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncedTask_workspaceId_userId_dueAt_idx" ON "SyncedTask"("workspaceId", "userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyncedTask_workspaceId_provider_externalId_key" ON "SyncedTask"("workspaceId", "provider", "externalId");

-- AddForeignKey
ALTER TABLE "SyncedTask" ADD CONSTRAINT "SyncedTask_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncedTask" ADD CONSTRAINT "SyncedTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

