-- CreateEnum
CREATE TYPE "AppAuthType" AS ENUM ('OAuth2', 'DesktopApp', 'ExternalTool', 'Unavailable');

-- AlterTable
ALTER TABLE "App" ADD COLUMN     "authType" "AppAuthType" NOT NULL DEFAULT 'ExternalTool',
ADD COLUMN     "brandColor" TEXT,
ADD COLUMN     "hasRealLogo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "officialWebsite" TEXT;
