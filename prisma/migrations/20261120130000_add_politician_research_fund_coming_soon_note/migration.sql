-- 調研費を非公開のまま、公開サイトの議員一覧に「準備中」としてグレーで出せるようにする（添え書き付き）。
-- nullable で既存行の UPDATE はしない（NULL = これまでどおり出さない）。値は admin から入力する。

-- AlterTable
ALTER TABLE "politicians" ADD COLUMN     "research_fund_coming_soon_note" TEXT;

-- 「準備中」は調研費を公開していない議員だけ（公開中かつ準備中という状態を DB でも作らせない）。
-- 判定の正は shared/models/politician.ts（Politician.setResearchFundPublic / setResearchFundComingSoonNote）。
ALTER TABLE "politicians" ADD CONSTRAINT "politicians_research_fund_coming_soon_only_private"
  CHECK (NOT "is_research_fund_public" OR "research_fund_coming_soon_note" IS NULL);
