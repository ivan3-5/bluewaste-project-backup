-- CreateEnum
CREATE TYPE "WasteCategory_new" AS ENUM (
  'PLASTIC_WASTE',
  'ORGANIC_WASTE',
  'GLASS_WASTE',
  'METAL_WASTE',
  'PAPER_WASTE'
);

-- Map legacy values to the new standardized categories
ALTER TABLE "Report"
ALTER COLUMN "category" TYPE "WasteCategory_new" USING (
  CASE "category"
    WHEN 'ORGANIC' THEN 'ORGANIC_WASTE'
    WHEN 'LIQUID' THEN 'ORGANIC_WASTE'
    WHEN 'ELECTRONIC' THEN 'METAL_WASTE'
    WHEN 'HAZARDOUS' THEN 'METAL_WASTE'
    WHEN 'RECYCLABLE' THEN 'PLASTIC_WASTE'
    WHEN 'SOLID_WASTE' THEN 'PLASTIC_WASTE'
    WHEN 'OTHER' THEN 'PLASTIC_WASTE'
    ELSE 'PLASTIC_WASTE'
  END
)::"WasteCategory_new";

DROP TYPE "WasteCategory";

ALTER TYPE "WasteCategory_new" RENAME TO "WasteCategory";
