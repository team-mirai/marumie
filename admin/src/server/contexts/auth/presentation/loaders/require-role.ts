import "server-only";

import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import { type UserRole, UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";

/** 機能を使えるロール。空の指定（＝誰でも通る）を型で禁じるため 1 つ以上を必須にする */
export type AllowedRoles = readonly [UserRole, ...UserRole[]];

/**
 * 指定したロールのいずれかを持つユーザーを取得する（admin は常に通る）。
 * 未認証なら UNAUTHORIZED、ロールが足りなければ INSUFFICIENT_PERMISSION の例外を投げる。
 *
 * proxy (middleware) による認証はルーティング層のゲートに過ぎず、ロールも見ない。
 * サーバーアクションは ID さえ分かればどの画面からでも呼べるので、
 * 副作用を伴う処理・データを返す処理では必ずこのガードを通すこと
 * （Route Handler 用は requireRoleResponse、ページ用は requireRolePage）。
 * 通していないサーバーアクション / Route Handler / ページは tests/server/contexts/auth/presentation/loaders/role-guard-coverage.test.ts が検出する。
 */
export async function requireRole(...allowed: AllowedRoles): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthError("UNAUTHORIZED", "認証が必要です");
  }

  if (!UserRoleModel.canUse(user.roles, allowed)) {
    throw new AuthError("INSUFFICIENT_PERMISSION", "この機能を使う権限がありません");
  }

  return user;
}
