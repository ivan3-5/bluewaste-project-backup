-- Drop resort/Barangay related objects introduced in earlier migrations.
-- This migration is safe to apply on databases where these objects may already be absent.

-- Drop foreign key constraints referencing Barangay
ALTER TABLE IF EXISTS "User" DROP CONSTRAINT IF EXISTS "User_barangayId_fkey";
ALTER TABLE IF EXISTS "Report" DROP CONSTRAINT IF EXISTS "Report_barangayId_fkey";

-- Drop indexes that include barangayId
DROP INDEX IF EXISTS "Report_barangayId_idx";
DROP INDEX IF EXISTS "Report_isDeleted_barangayId_createdAt_idx";

-- Drop barangayId columns from tables
ALTER TABLE IF EXISTS "User" DROP COLUMN IF EXISTS "barangayId";
ALTER TABLE IF EXISTS "Report" DROP COLUMN IF EXISTS "barangayId";

-- Drop resort-related tables (if present)
DROP TABLE IF EXISTS "ResortImage" CASCADE;
DROP TABLE IF EXISTS "ResortZone" CASCADE;
DROP TABLE IF EXISTS "ResortArea" CASCADE;
DROP TABLE IF EXISTS "Barangay" CASCADE;

-- Notes:
-- After applying this migration, run `npx prisma migrate resolve --applied "20260529_drop_resort_admin"`
-- or use your usual workflow to mark the migration as applied.
