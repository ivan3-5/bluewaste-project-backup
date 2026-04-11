-- Safely align existing databases that still have the old ResortBox table name.
DO $$
BEGIN
  IF to_regclass('"ResortBox"') IS NOT NULL AND to_regclass('"ResortArea"') IS NULL THEN
    ALTER TABLE "ResortBox" RENAME TO "ResortArea";
  END IF;
END $$;

-- Normalize old index names if they exist from previously applied migrations.
ALTER INDEX IF EXISTS "ResortBox_name_key" RENAME TO "ResortArea_name_key";
ALTER INDEX IF EXISTS "ResortBox_ownerId_idx" RENAME TO "ResortArea_ownerId_idx";
ALTER INDEX IF EXISTS "ResortBox_ownerId_isActive_idx" RENAME TO "ResortArea_ownerId_isActive_idx";
ALTER INDEX IF EXISTS "ResortBox_createdById_idx" RENAME TO "ResortArea_createdById_idx";
ALTER INDEX IF EXISTS "ResortBox_isActive_minLat_maxLat_minLng_maxLng_idx" RENAME TO "ResortArea_isActive_minLat_maxLat_minLng_maxLng_idx";

-- Normalize old constraint names if they exist from previously applied migrations.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResortBox_pkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResortArea_pkey') THEN
    ALTER TABLE "ResortArea" RENAME CONSTRAINT "ResortBox_pkey" TO "ResortArea_pkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResortBox_ownerId_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResortArea_ownerId_fkey') THEN
    ALTER TABLE "ResortArea" RENAME CONSTRAINT "ResortBox_ownerId_fkey" TO "ResortArea_ownerId_fkey";
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResortBox_createdById_fkey')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ResortArea_createdById_fkey') THEN
    ALTER TABLE "ResortArea" RENAME CONSTRAINT "ResortBox_createdById_fkey" TO "ResortArea_createdById_fkey";
  END IF;
END $$;
