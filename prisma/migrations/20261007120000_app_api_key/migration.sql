-- AlterEnum
ALTER TYPE "AppAuthType" ADD VALUE 'ApiKey';

-- AlterTable
ALTER TABLE "App" ADD COLUMN     "apiAccess" TEXT,
ADD COLUMN     "apiCheckedAt" TIMESTAMP(3),
ADD COLUMN     "apiConfidence" TEXT,
ADD COLUMN     "apiDocsUrl" TEXT,
ADD COLUMN     "tokenName" TEXT,
ADD COLUMN     "tokenReadAccess" TEXT,
ADD COLUMN     "tokenWhere" TEXT;
