-- Update existing NULL values to empty object
UPDATE "organization_report_profiles" SET "details" = '{}' WHERE "details" IS NULL;

-- Make details column NOT NULL
ALTER TABLE "organization_report_profiles" ALTER COLUMN "details" SET NOT NULL;
