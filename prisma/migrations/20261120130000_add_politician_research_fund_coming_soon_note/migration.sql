-- 調研費を非公開のまま、公開サイトの議員一覧に「準備中」としてグレーで出せるようにする（添え書き付き）。
-- nullable で既存行の UPDATE はしない（NULL = これまでどおり出さない）。値は admin から入力する。

-- AlterTable
ALTER TABLE "politicians" ADD COLUMN     "research_fund_coming_soon_note" TEXT;
