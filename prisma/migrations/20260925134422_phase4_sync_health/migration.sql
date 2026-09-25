-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "lastSyncAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncError" TEXT;
