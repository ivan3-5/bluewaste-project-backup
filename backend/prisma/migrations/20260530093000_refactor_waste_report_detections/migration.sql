-- CreateEnum
CREATE TYPE "WasteType" AS ENUM ('PLASTIC', 'ORGANIC', 'GLASS', 'METAL', 'PAPER');

-- AlterTable
ALTER TABLE "WasteReport"
ADD COLUMN "detections" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "dominantWaste" "WasteType",
ADD COLUMN "totalItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'low';

-- Remove old wasteType column and enum
DROP INDEX IF EXISTS "WasteReport_wasteType_idx";
ALTER TABLE "WasteReport" DROP COLUMN "wasteType";
DROP TYPE "AiWasteType";

-- Index for dominant waste lookups
CREATE INDEX "WasteReport_dominantWaste_idx" ON "WasteReport"("dominantWaste");
