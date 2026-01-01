-- Revert: Make counterpart address NOT NULL again
-- First update any NULL values to empty string
UPDATE "public"."counterparts" SET "address" = '' WHERE "address" IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE "public"."counterparts" ALTER COLUMN "address" SET NOT NULL;
