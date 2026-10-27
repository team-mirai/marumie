-- 公開用の版を作り直すとき、書類ごとに黒塗りの追加の指示を付けられるようにする（#1867）。
-- 指示は書類に保存し、キュー・定期実行・止まったあとの作り直しでも使う。NULL = 指示なし。
-- 既存の書類はすべて NULL のまま（UPDATE はしない）。長さの上限はアプリ側で検証する。

-- AlterTable
ALTER TABLE "research_fund_documents" ADD COLUMN     "masking_instruction" TEXT;
