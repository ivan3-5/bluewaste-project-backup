-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('DIRTY', 'CLEAN');

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "analysisConfidence" DOUBLE PRECISION,
ADD COLUMN     "analysisStatus" "AnalysisStatus",
ADD COLUMN     "analysisWasteCount" INTEGER,
ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "isSpam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spamMarkedAt" TIMESTAMP(3),
ADD COLUMN     "spamReason" TEXT;

-- CreateIndex
CREATE INDEX "Report_isDeleted_isSpam_createdAt_idx" ON "Report"("isDeleted", "isSpam", "createdAt");

-- CreateIndex
CREATE INDEX "Report_isDeleted_isSpam_spamMarkedAt_idx" ON "Report"("isDeleted", "isSpam", "spamMarkedAt");
