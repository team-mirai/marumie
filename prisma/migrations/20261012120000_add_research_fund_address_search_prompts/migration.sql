-- 支払先の住所検索プロンプトを議員ごとに版で持てるようにする（#1732）
-- 検索結果の傾向をデプロイせずに直せるよう、読み取りプロンプトと同じく画面から編集・巻き戻しするため。
-- 新規テーブルの追加だけで、既存データの変換は行わない。

-- CreateTable
CREATE TABLE "research_fund_address_search_prompts" (
    "id" BIGSERIAL NOT NULL,
    "politician_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_fund_address_search_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "research_fund_address_search_prompts_politician_id_is_activ_idx" ON "research_fund_address_search_prompts"("politician_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "research_fund_address_search_prompts_politician_id_version_key" ON "research_fund_address_search_prompts"("politician_id", "version");

-- AddForeignKey
ALTER TABLE "research_fund_address_search_prompts" ADD CONSTRAINT "research_fund_address_search_prompts_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_fund_address_search_prompts" ADD CONSTRAINT "research_fund_address_search_prompts_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
