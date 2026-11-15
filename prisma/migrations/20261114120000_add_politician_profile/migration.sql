-- 公開サイトの議員カード・議員ページの見出しに出すプロフィールと顔写真を、admin から登録できるようにする（#1916）
-- すべて nullable か既定値つきで、既存行の UPDATE はしない。値は admin から手で入力する。

-- CreateEnum
CREATE TYPE "PoliticianHouse" AS ENUM ('shugiin', 'sangiin');

-- AlterTable
ALTER TABLE "politicians" ADD COLUMN     "name_kana" VARCHAR(255),
ADD COLUMN     "house" "PoliticianHouse",
ADD COLUMN     "constituency" VARCHAR(255),
ADD COLUMN     "profile_url" TEXT,
ADD COLUMN     "website_url" TEXT,
ADD COLUMN     "sns_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "photo_path" TEXT;
