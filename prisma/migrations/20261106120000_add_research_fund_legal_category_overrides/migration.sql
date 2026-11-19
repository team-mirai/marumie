-- 管理者が許可した帳簿に限り、仕訳ごとに法定区分を上書きできるようにする（#1880）
-- まる見え導入前に報告書を提出済みの年度の帳簿で、報告書で使った区分が科目の既定と違う仕訳があり、
-- 区分別の合計を提出済みの報告書と合わせるため。科目→法定区分の共通ルールそのものは変えない。
-- 既存の帳簿はすべて「許可しない」で始まり、上書きの行は 0 件（既存行の UPDATE は無い）。

-- AlterTable
ALTER TABLE "research_fund_books" ADD COLUMN     "allow_legal_category_override" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "research_fund_legal_category_overrides" (
    "id" BIGSERIAL NOT NULL,
    "entry_id" BIGINT NOT NULL,
    "legal_category_key" VARCHAR(50) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_legal_category_overrides_pkey" PRIMARY KEY ("id"),
    -- 上書きには理由が必須。空白だけの理由は残さない
    CONSTRAINT "research_fund_legal_category_overrides_reason_not_blank" CHECK (btrim("reason", E' \t\n\r　') <> '')
);

-- CreateIndex
CREATE UNIQUE INDEX "research_fund_legal_category_overrides_entry_id_key" ON "research_fund_legal_category_overrides"("entry_id");

-- AddForeignKey
ALTER TABLE "research_fund_legal_category_overrides" ADD CONSTRAINT "research_fund_legal_category_overrides_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "research_fund_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_legal_category_overrides" ADD CONSTRAINT "research_fund_legal_category_overrides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
