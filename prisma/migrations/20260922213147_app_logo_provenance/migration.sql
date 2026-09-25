-- AlterTable
ALTER TABLE "App" ADD COLUMN     "logoPath" TEXT,
ADD COLUMN     "logoSource" TEXT,
ADD COLUMN     "logoVerified" BOOLEAN NOT NULL DEFAULT false;
