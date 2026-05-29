BEGIN;
-- Change any existing RESORT_ADMIN values to LGU_ADMIN
UPDATE "User" SET role = 'LGU_ADMIN' WHERE role = 'RESORT_ADMIN';
-- Ensure the column default is a valid enum value from the new schema
ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'CITIZEN';
COMMIT;
