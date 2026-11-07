-- 初回ログイン前の人に、ロールと担当議員を招待（予約）しておけるようにする（#1882）
-- 招待メールは送らない。持ち主を確かめられた初回ログインで User を作るとき、同じトランザクションで
-- ロールと担当議員を付けて招待の行を消す（使用済みの履歴は持たない）。
-- 既存のテーブル・データには手を入れず、テーブルを 2 つ足すだけ（既存行の UPDATE は無い）。

-- CreateTable
CREATE TABLE "user_invitations" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "roles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[],
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invitation_politicians" (
    "invitation_id" TEXT NOT NULL,
    "politician_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "user_invitations_email_key" ON "user_invitations"("email");

-- CreateIndex
CREATE INDEX "user_invitation_politicians_politician_id_idx" ON "user_invitation_politicians"("politician_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_invitation_politicians_invitation_id_politician_id_key" ON "user_invitation_politicians"("invitation_id", "politician_id");

-- AddForeignKey
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitation_politicians" ADD CONSTRAINT "user_invitation_politicians_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "user_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invitation_politicians" ADD CONSTRAINT "user_invitation_politicians_politician_id_fkey" FOREIGN KEY ("politician_id") REFERENCES "politicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
