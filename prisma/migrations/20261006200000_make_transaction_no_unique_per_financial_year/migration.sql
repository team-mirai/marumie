-- 取引No の一意性を「団体ごと」から「団体＋年度ごと」に改める（#1681）
--   MF クラウド会計の取引No は年度が変わると 1 から振り直されるため、団体ごとに一意だと
--   新年度の同じ番号の取引が前年度の取引の「更新」として扱われ、上書きされてしまう。
--   既存データは書き換えない（本番で「団体＋年度＋取引No」の重複が 0 件であることを確認済み）。
--   新しい一意インデックスを先に作ってから古いものを消し、一意性が外れる瞬間を作らない。

BEGIN;

CREATE UNIQUE INDEX "transactions_political_organization_id_financial_year_trans_key" ON "public"."transactions"("political_organization_id", "financial_year", "transaction_no");

DROP INDEX "public"."transactions_political_organization_id_transaction_no_key";

COMMIT;
