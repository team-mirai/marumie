-- 公開サイトの政治団体カード・政治団体ページの見出しに出す写真・公式サイト・SNS を、admin から登録できるようにする（#1917）
-- すべて nullable か既定値つきで、既存行の UPDATE はしない。値は admin から手で入力する。

-- AlterTable
ALTER TABLE "political_organizations" ADD COLUMN     "website_url" TEXT,
ADD COLUMN     "sns_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "photo_path" TEXT;
