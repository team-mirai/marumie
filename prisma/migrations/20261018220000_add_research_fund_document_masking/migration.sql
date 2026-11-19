-- すべての書類について、メタデータを消して個人情報を黒塗りした公開用の版を作る（#1802）。
-- 公開用の版のファイルの場所は既存の masked_key を使い、その状態を書類に持たせる。
-- 既存の書類は既定値で pending になり、帳簿の画面を開いたときに順次作られる（UPDATE はしない）。

-- CreateEnum
CREATE TYPE "ResearchFundMaskingStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed');

-- AlterTable
ALTER TABLE "research_fund_documents" ADD COLUMN     "masked_region_count" INTEGER,
ADD COLUMN     "masking_error" TEXT,
ADD COLUMN     "masking_started_at" TIMESTAMP(3),
ADD COLUMN     "masking_status" "ResearchFundMaskingStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "research_fund_documents_book_id_masking_status_idx" ON "research_fund_documents"("book_id", "masking_status");
