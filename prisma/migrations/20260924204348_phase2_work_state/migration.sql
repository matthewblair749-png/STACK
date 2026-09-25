-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PendingActionKind" ADD VALUE 'UpdateProjectStatus';
ALTER TYPE "PendingActionKind" ADD VALUE 'UpdateTask';
ALTER TYPE "PendingActionKind" ADD VALUE 'CreateCalendarEvent';

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'Blocked';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summaryUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "waitingOnId" TEXT;
