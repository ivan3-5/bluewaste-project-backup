-- Rename Report.resortBoxId to Report.resortAreaId for naming consistency.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Report'
      AND column_name = 'resortBoxId'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Report'
      AND column_name = 'resortAreaId'
  ) THEN
    ALTER TABLE "Report" RENAME COLUMN "resortBoxId" TO "resortAreaId";
  END IF;
END $$;

-- Keep index names aligned with the renamed column.
ALTER INDEX IF EXISTS "Report_resortBoxId_idx" RENAME TO "Report_resortAreaId_idx";
ALTER INDEX IF EXISTS "Report_isDeleted_resortBoxId_createdAt_idx" RENAME TO "Report_isDeleted_resortAreaId_createdAt_idx";

-- Keep foreign key constraint name aligned with the renamed column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Report_resortBoxId_fkey'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Report_resortAreaId_fkey'
  ) THEN
    ALTER TABLE "Report"
      RENAME CONSTRAINT "Report_resortBoxId_fkey" TO "Report_resortAreaId_fkey";
  END IF;
END $$;
