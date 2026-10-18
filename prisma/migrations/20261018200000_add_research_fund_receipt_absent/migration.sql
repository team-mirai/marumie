-- 書類の有無とは別に、仕訳に「徴難」（領収書等を徴し難かった）のフラグを持たせる（#1778）
-- 振込明細などの書類はあるが領収書が無い支出を、書類を登録したまま徴難として帳簿に出すため。

-- AlterTable
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "receipt_absent" BOOLEAN NOT NULL DEFAULT false;

-- 今の帳簿の出力（書類なし → 徴難 / 無）を変えないため、書類の無い支出の仕訳を徴難にする。
UPDATE "research_fund_journal_entries"
  SET "receipt_absent" = true
  WHERE "document_id" IS NULL AND "source" <> 'grant';

-- 書類と事情の排他をやめ、事情は徴難の仕訳だけが持てるようにする。
ALTER TABLE "research_fund_journal_entries"
  DROP CONSTRAINT "research_fund_journal_entries_receipt_absence_requires_no_doc";

ALTER TABLE "research_fund_journal_entries"
  ADD CONSTRAINT "research_fund_journal_entries_receipt_absence_requires_absent"
  CHECK ("receipt_absent" OR "receipt_absence_reason" IS NULL);

-- 支給の仕訳は徴難にしない。
ALTER TABLE "research_fund_journal_entries"
  ADD CONSTRAINT "research_fund_journal_entries_receipt_absent_not_grant"
  CHECK ("source" <> 'grant' OR NOT "receipt_absent");
