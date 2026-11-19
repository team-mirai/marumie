-- ユーザーが担当する議員を表す中間テーブルを新設する（#1773）
-- 調査研究費の書き込みを担当の議員室に絞るため。既存データの変換はしない（admin がユーザー管理画面から担当を付ける）。

-- CreateTable
CREATE TABLE "user_politician_assignments" (
    "user_id" TEXT NOT NULL,
    "politician_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "user_politician_assignments_politician_id_idx" ON "user_politician_assignments"("politician_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_politician_assignments_user_id_politician_id_key" ON "user_politician_assignments"("user_id", "politician_id");

-- AddForeignKey
ALTER TABLE "user_politician_assignments" ADD CONSTRAINT "user_politician_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_politician_assignments" ADD CONSTRAINT "user_politician_assignments_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

