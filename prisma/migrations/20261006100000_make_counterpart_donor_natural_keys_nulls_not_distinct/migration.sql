-- 取引先・寄付者の自然キーの一意制約で、address が NULL の行も重複として扱う（#1482）
--   既定の一意インデックスは NULL 同士を別物とみなすため、(name, NULL) の取引先や
--   (name, NULL, donor_type) の寄付者を何行でも作れてしまい、自然キーで引いたときに ID が不定になっていた。
--   1. 既存の重複行を、自然キーごとに最小の id の行へ統合する（紐づけを付け替えてから余りを削除）
--   2. 一意インデックスを NULLS NOT DISTINCT（PostgreSQL 15 以降）で張り直す
--   Prisma の schema は NULLS NOT DISTINCT を表現できないため、@@unique はそのまま残してここで張り替える。
--   統合で残す行の属性（郵便番号・職業・テナント）は最小 id の行のものをそのまま使う。
--   紐づけ表は transaction_id ごとに 1 行の一意制約があるので、付け替えで (transaction_id, *_id) が重複することはない。

-- 付け替えの UPDATE で紐づけ表の検証トリガーが既存行を再検証しないよう、統合の間だけ止める。
-- トリガーが見るのは取引の種別・カテゴリと寄付者の donor_type だけで、統合先も同じ donor_type なので
-- 付け替えで検証結果は変わらない。止めないと、トリガーの規則が後から変わって今の規則に合わない既存の紐づけで失敗しうる。
ALTER TABLE "public"."transaction_counterparts" DISABLE TRIGGER "validate_transaction_counterpart_insert";
ALTER TABLE "public"."transaction_donors" DISABLE TRIGGER "validate_transaction_donor_insert";

-- 1-a. 取引先の重複統合
WITH merge_map AS (
  SELECT id AS duplicate_id, keep_id
  FROM (
    SELECT id, MIN(id) OVER (PARTITION BY name, address) AS keep_id
    FROM "public"."counterparts"
    WHERE address IS NULL
  ) t
  WHERE id <> keep_id
)
UPDATE "public"."transaction_counterparts" tc
SET counterpart_id = m.keep_id
FROM merge_map m
WHERE tc.counterpart_id = m.duplicate_id;

DELETE FROM "public"."counterparts" c
USING (
  SELECT id, MIN(id) OVER (PARTITION BY name, address) AS keep_id
  FROM "public"."counterparts"
  WHERE address IS NULL
) t
WHERE c.id = t.id AND t.id <> t.keep_id;

-- 1-b. 寄付者の重複統合
WITH merge_map AS (
  SELECT id AS duplicate_id, keep_id
  FROM (
    SELECT id, MIN(id) OVER (PARTITION BY name, address, donor_type) AS keep_id
    FROM "public"."donors"
    WHERE address IS NULL
  ) t
  WHERE id <> keep_id
)
UPDATE "public"."transaction_donors" td
SET donor_id = m.keep_id
FROM merge_map m
WHERE td.donor_id = m.duplicate_id;

DELETE FROM "public"."donors" d
USING (
  SELECT id, MIN(id) OVER (PARTITION BY name, address, donor_type) AS keep_id
  FROM "public"."donors"
  WHERE address IS NULL
) t
WHERE d.id = t.id AND t.id <> t.keep_id;

ALTER TABLE "public"."transaction_counterparts" ENABLE TRIGGER "validate_transaction_counterpart_insert";
ALTER TABLE "public"."transaction_donors" ENABLE TRIGGER "validate_transaction_donor_insert";

-- 2. 一意インデックスを NULLS NOT DISTINCT で張り直す（名前は Prisma の既定名のまま）
DROP INDEX "public"."counterparts_name_address_key";
CREATE UNIQUE INDEX "counterparts_name_address_key" ON "public"."counterparts"("name", "address") NULLS NOT DISTINCT;

DROP INDEX "public"."donors_name_address_donor_type_key";
CREATE UNIQUE INDEX "donors_name_address_donor_type_key" ON "public"."donors"("name", "address", "donor_type") NULLS NOT DISTINCT;
