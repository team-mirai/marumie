-- ユーザーに複数の機能ロールを付けられるようにする（#1772）
-- 調査研究費担当（秘書）と政治資金担当で使える画面を分けるため、ロールを「使える業務」を表す値に変え、
-- users.role（単一）を users.roles（配列）に置き換える。`user` ロールは廃止する。
--
-- 既存データの変換:
--   role = 'admin'                                         → {admin}
--   role = 'user' かつ調査研究費の書類アップロード / 仕訳作成の実績あり → {political_fund, research_fund}
--   それ以外の role = 'user'                               → {political_fund}

-- CreateEnum
CREATE TYPE "UserRole_new" AS ENUM ('admin', 'political_fund', 'research_fund');

-- AddColumn
ALTER TABLE "users" ADD COLUMN "roles" "UserRole_new"[] NOT NULL DEFAULT ARRAY[]::"UserRole_new"[];

-- MigrateData
UPDATE "users" SET "roles" = ARRAY['admin']::"UserRole_new"[] WHERE "role" = 'admin';

UPDATE "users" AS u
SET "roles" = ARRAY['political_fund', 'research_fund']::"UserRole_new"[]
WHERE u."role" = 'user'
  AND (
    EXISTS (SELECT 1 FROM "research_fund_scan_batches" b WHERE b."uploaded_by_id" = u."id")
    OR EXISTS (SELECT 1 FROM "research_fund_journal_entries" e WHERE e."created_by_id" = u."id")
  );

UPDATE "users"
SET "roles" = ARRAY['political_fund']::"UserRole_new"[]
WHERE "role" = 'user' AND cardinality("roles") = 0;

-- DropColumn
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum / RenameEnum
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
