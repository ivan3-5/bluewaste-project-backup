/*
  Warnings:

  - You are about to drop the column `priority` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "priority";

-- DropEnum
DROP TYPE "Priority";

-- CreateTable
CREATE TABLE "ReportingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coordinates" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ReportingZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportingZone_isActive_idx" ON "ReportingZone"("isActive");

-- CreateIndex
CREATE INDEX "ReportingZone_createdById_idx" ON "ReportingZone"("createdById");

-- AddForeignKey
ALTER TABLE "ReportingZone" ADD CONSTRAINT "ReportingZone_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
