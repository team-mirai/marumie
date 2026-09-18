import "server-only";

import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { requireAuth } from "@/server/contexts/auth/presentation/loaders/require-auth";

/**
 * admin ロールのユーザーを取得する。未認証・権限不足の場合は例外を投げる。
 *
 * proxy (middleware) はロールを見ないため、admin 限定のサーバーアクションでは必ずこれを通す
 * （Route Handler 用は {@link requireAdminResponse}）。
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();

  if (!UserRoleModel.isAdmin(user.role)) {
    throw new AuthError("INSUFFICIENT_PERMISSION", "管理者権限が必要です");
  }

  return user;
}
