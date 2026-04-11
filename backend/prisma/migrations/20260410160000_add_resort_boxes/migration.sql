-- Add new role for area-scoped dashboard accounts
ALTER TYPE "Role" ADD VALUE 'RESORT_ADMIN';

-- Create saved map boxes owned by resort admins
CREATE TABLE "ResortArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "minLat" DOUBLE PRECISION NOT NULL,
    "maxLat" DOUBLE PRECISION NOT NULL,
    "minLng" DOUBLE PRECISION NOT NULL,
    "maxLng" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ResortArea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResortArea_name_key" ON "ResortArea"("name");
CREATE INDEX "ResortArea_ownerId_idx" ON "ResortArea"("ownerId");
CREATE INDEX "ResortArea_ownerId_isActive_idx" ON "ResortArea"("ownerId", "isActive");
CREATE INDEX "ResortArea_createdById_idx" ON "ResortArea"("createdById");
CREATE INDEX "ResortArea_isActive_minLat_maxLat_minLng_maxLng_idx" ON "ResortArea"("isActive", "minLat", "maxLat", "minLng", "maxLng");

ALTER TABLE "ResortArea"
    ADD CONSTRAINT "ResortArea_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ResortArea"
    ADD CONSTRAINT "ResortArea_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Persist the matched box for each report
ALTER TABLE "Report" ADD COLUMN "resortBoxId" TEXT;
CREATE INDEX "Report_resortBoxId_idx" ON "Report"("resortBoxId");
CREATE INDEX "Report_isDeleted_resortBoxId_createdAt_idx" ON "Report"("isDeleted", "resortBoxId", "createdAt");

ALTER TABLE "Report"
    ADD CONSTRAINT "Report_resortBoxId_fkey"
    FOREIGN KEY ("resortBoxId") REFERENCES "ResortArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
