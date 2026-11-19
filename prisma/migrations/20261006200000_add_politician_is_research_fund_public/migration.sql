-- 議員ごとに調研費を公開するかを持てるようにする（#1677）
-- 多くの議員室でプレビューしながら順次公開するため、既存・新規とも「公開しない」（false）から始める。
-- 既存行は既定値 false のままで、既存データの UPDATE は行わない（先行公開中の議員は人間が手動で true にする）。

-- AlterTable
ALTER TABLE "politicians" ADD COLUMN "is_research_fund_public" BOOLEAN NOT NULL DEFAULT false;
