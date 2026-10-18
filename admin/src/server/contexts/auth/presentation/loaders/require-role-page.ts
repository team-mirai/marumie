import "server-only";

import { redirect } from "next/navigation";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import type { AllowedRoles } from "@/server/contexts/auth/presentation/loaders/require-role";

/**
 * ページ用のロールガード（admin は常に通る）。
 *
 * 未認証ならログイン画面へ、ロールが足りなければダッシュボードへリダイレクトする。
 * レイアウトはクライアント遷移で再実行されず、ページと並行してレンダリングされるため、
 * ガードはレイアウトではなく各ページの先頭（データ取得より前）で呼ぶこと。
 */
export async function requireRolePage(...allowed: AllowedRoles): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!UserRoleModel.canUse(user.roles, allowed)) {
    redirect("/");
  }

  return user;
}
