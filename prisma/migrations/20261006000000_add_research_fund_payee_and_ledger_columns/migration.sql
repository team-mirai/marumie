-- 議員課に提出する調研費の帳簿（衆議院・参議院フォーマット）に必要なデータを持てるようにする（#1655）
--   1. 支払先（支出を受けた者）のテーブル。議員ごとに名称・郵便番号・住所・インボイス登録番号を持つ
--   2. 仕訳から支払先への参照と、誰が紐づけたか（手動・ルール照合・AI）・AI の確信度・根拠
--   3. 書類の領収書等番号（帳簿の中で一意な通し番号）
--   4. 仕訳の「領収書等を徴し難かった事情」「資金管理団体からの支出」「1万円超として扱う」の手動上書き
-- 既存行は追加列の既定値（NULL / false）のままで、既存データの UPDATE は行わない。

-- CreateEnum（支払先を紐づけた主体）
CREATE TYPE "ResearchFundPayeeLinkSource" AS ENUM ('manual', 'rule', 'ai');

-- CreateTable
-- 政治資金の counterparts とは共用しない（調研費は transactions 系と完全に別系統で、
-- counterparts は全テナント横断の一意制約と DB トリガーを持つため）。
CREATE TABLE "research_fund_payees" (
    "id" BIGSERIAL NOT NULL,
    "politician_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "postal_code" VARCHAR(10),
    -- 住所は NULL を使わず未入力を空文字で表す。counterparts の自然キーが address NULL を
    -- 重複扱いせず同じ取引先の行を何行でも作れてしまう問題（#1482）を繰り返さないため。
    "address" VARCHAR(255) NOT NULL DEFAULT '',
    "invoice_registration_number" VARCHAR(14),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_payees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex（支払先は議員ごとに持つ。同じ名称・住所の支払先を二重に作らない）
CREATE UNIQUE INDEX "research_fund_payees_politician_id_name_address_key" ON "research_fund_payees"("politician_id", "name", "address");

-- AddForeignKey
ALTER TABLE "research_fund_payees" ADD CONSTRAINT "research_fund_payees_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable（仕訳）
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "payee_id" BIGINT;
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "payee_link_source" "ResearchFundPayeeLinkSource";
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "payee_link_confidence" DECIMAL(4,3);
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "payee_link_reason" TEXT;
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "receipt_absence_reason" TEXT;
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "from_fund_management_org" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "research_fund_journal_entries" ADD COLUMN "treat_as_over_ten_thousand" BOOLEAN;

-- CreateIndex（支払先ごとの仕訳の絞り込み・支払先の削除可否の判定用）
CREATE INDEX "research_fund_journal_entries_payee_id_idx" ON "research_fund_journal_entries"("payee_id");

-- AddForeignKey
-- 紐づけ先を消すときは先に紐づけを外す（誰が紐づけたかだけが残る状態を作らない）。
-- RESTRICT ではなく NO ACTION にするのは、議員の削除で支払先と仕訳が同時に消える
-- カスケードを止めないため（NO ACTION は文の終わりに検査する）。
ALTER TABLE "research_fund_journal_entries" ADD CONSTRAINT "research_fund_journal_entries_payee_id_fkey" FOREIGN KEY ("payee_id") REFERENCES "research_fund_payees"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- 支払先があるなら誰が紐づけたかを必ず残し、支払先が無いのに紐づけ元だけが残る状態も禁止する。
ALTER TABLE "research_fund_journal_entries"
  ADD CONSTRAINT "research_fund_journal_entries_payee_link_source_requires_payee"
  CHECK (("payee_id" IS NULL) = ("payee_link_source" IS NULL));

-- 確信度と根拠は AI が紐づけたときだけ持つ（人やルールの紐づけに確信度は無い）。
ALTER TABLE "research_fund_journal_entries"
  ADD CONSTRAINT "research_fund_journal_entries_payee_link_ai_fields"
  CHECK ("payee_link_source" = 'ai' OR ("payee_link_confidence" IS NULL AND "payee_link_reason" IS NULL));

-- 確信度は 0〜1。
ALTER TABLE "research_fund_journal_entries"
  ADD CONSTRAINT "research_fund_journal_entries_payee_link_confidence_range"
  CHECK ("payee_link_confidence" IS NULL OR ("payee_link_confidence" >= 0 AND "payee_link_confidence" <= 1));

-- 「徴し難かった事情」は領収書が無い仕訳だけが持てる（領収書があるのに事情が残る状態を禁止する）。
ALTER TABLE "research_fund_journal_entries"
  ADD CONSTRAINT "research_fund_journal_entries_receipt_absence_requires_no_doc"
  CHECK ("document_id" IS NULL OR "receipt_absence_reason" IS NULL);

-- AlterTable（書類）
-- 領収書等番号。帳簿の中で一意な通し番号。NULL = 未採番。
ALTER TABLE "research_fund_documents" ADD COLUMN "receipt_number" INTEGER;

ALTER TABLE "research_fund_documents"
  ADD CONSTRAINT "research_fund_documents_receipt_number_positive"
  CHECK ("receipt_number" IS NULL OR "receipt_number" > 0);

-- CreateIndex（未採番の NULL は重複してよい＝採番済みのものだけが帳簿内で一意になる）
CREATE UNIQUE INDEX "research_fund_documents_book_id_receipt_number_key" ON "research_fund_documents"("book_id", "receipt_number");
