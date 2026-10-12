-- 支払先の表記（書類から読み取った発行元の名称のうち、その支払先を指すと分かったもの）を持てるようにする（#1727）
-- 支払先の名称を正式名称に直しても、書類上の表記で同じ相手に紐づくようにするため。
-- 新規テーブルの追加だけで、既存データの変換は行わない。

-- CreateTable
CREATE TABLE "research_fund_payee_aliases" (
    "id" BIGSERIAL NOT NULL,
    "payee_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "normalized_name" VARCHAR(255) NOT NULL,
    "source" "ResearchFundPayeeLinkSource" NOT NULL,
    "document_id" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_payee_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex（同じ支払先に同じ表記を二重に持たない。別の支払先に同じ表記があるのは許す）
CREATE UNIQUE INDEX "research_fund_payee_aliases_payee_id_normalized_name_key" ON "research_fund_payee_aliases"("payee_id", "normalized_name");

-- CreateIndex（照合で表記から支払先を引く）
CREATE INDEX "research_fund_payee_aliases_normalized_name_idx" ON "research_fund_payee_aliases"("normalized_name");

-- AddForeignKey
ALTER TABLE "research_fund_payee_aliases" ADD CONSTRAINT "research_fund_payee_aliases_payee_id_fkey" FOREIGN KEY ("payee_id") REFERENCES "research_fund_payees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_payee_aliases" ADD CONSTRAINT "research_fund_payee_aliases_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "research_fund_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
