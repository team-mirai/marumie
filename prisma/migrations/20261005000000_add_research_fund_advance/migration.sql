-- research_fund_journal_entries: 調研費の支出に「誰が立て替えたか」「精算が済んだか」を記録する（#1621）
-- 立替は仕訳として計上しない事務所内の管理情報なので、科目は増やさず支出仕訳の属性として持つ。
-- 既存行は advanced_by = NULL（立替なし）・settled_at = NULL（未精算）のままで、既存データの UPDATE は行わない。

-- AlterTable
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "advanced_by" VARCHAR(255);
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "settled_at" DATE;

-- 立替者がいないのに精算日がある状態（精算の記録だけが残る）を DB 側でも禁止する。
ALTER TABLE "research_fund_journal_entries"
  ADD CONSTRAINT "research_fund_journal_entries_settled_at_requires_advanced_by"
  CHECK ("advanced_by" IS NOT NULL OR "settled_at" IS NULL);

-- CreateIndex（立替者ごとの未精算の集計・絞り込み用）
CREATE INDEX "research_fund_journal_entries_advance_idx" ON "research_fund_journal_entries"("book_id", "advanced_by", "settled_at");
