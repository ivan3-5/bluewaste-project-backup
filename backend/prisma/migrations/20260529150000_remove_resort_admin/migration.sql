-- Drop foreign keys referencing ResortArea
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_resortAreaId_fkey";

-- Drop indexes on Report for resortAreaId
DROP INDEX IF EXISTS "Report_resortAreaId_idx";
DROP INDEX IF EXISTS "Report_isDeleted_resortAreaId_createdAt_idx";

-- Drop the column resortAreaId from Report
ALTER TABLE "Report" DROP COLUMN IF EXISTS "resortAreaId";

-- Drop ResortArea table and its indexes
DROP INDEX IF EXISTS "ResortArea_createdById_idx";
DROP INDEX IF EXISTS "ResortArea_isActive_minLat_maxLat_minLng_maxLng_idx";
DROP INDEX IF EXISTS "ResortArea_name_key";
DROP INDEX IF EXISTS "ResortArea_ownerId_idx";
DROP INDEX IF EXISTS "ResortArea_ownerId_isActive_idx";
DROP TABLE IF EXISTS "ResortArea";

-- Remove foreign keys from User that reference ResortArea (now gone)
-- The relations ownedResortAreas and createdResortAreas are defined in Prisma schema but not in the database as FK columns on User table

-- Remove RESORT_ADMIN from Role enum
-- PostgreSQL doesn't support removing enum values directly, so we need to alter the enum
-- First, check if there are any users with RESORT_ADMIN role
UPDATE "User" SET "role" = 'CITIZEN' WHERE "role" = 'RESORT_ADMIN';

-- Create a new enum type without RESORT_ADMIN
CREATE TYPE "Role_new" AS ENUM ('CITIZEN', 'LGU_ADMIN', 'FIELD_WORKER');

-- Alter the column to use the new enum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CITIZEN';

-- Drop the old enum
DROP TYPE IF EXISTS "Role" CASCADE;

-- Rename the new enum to the original name
ALTER TYPE "Role_new" RENAME TO "Role";