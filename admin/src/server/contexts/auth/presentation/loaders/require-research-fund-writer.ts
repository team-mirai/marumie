import "server-only";

import { cache } from "react";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import { requireRole } from "@/server/contexts/auth/presentation/loaders/require-role";
import { prisma } from "@/server/contexts/shared/infrastructure/prisma";
import { PrismaUserRepository } from "@/server/contexts/shared/infrastructure/repositories/prisma-user.repository";

/** ユーザーが担当する議員の ID。同じリクエストの中では結果を使い回す */
const loadAssignedPoliticianIds = cache(
  async (userId: string): Promise<string[]> =>
    new PrismaUserRepository(prisma).findAssignedPoliticianIds(userId),
);

/**
 * 議員の調査研究費のデータを変える操作のガード（#1773）。
 *
 * research_fund ロールを持ち、その議員を担当しているユーザーを返す（admin は担当に関係なく通る）。
 * 未認証なら UNAUTHORIZED、ロールが足りないか担当外なら INSUFFICIENT_PERMISSION の例外を投げる。
 * 閲覧は research_fund ロールがあれば全議員に開いているので、画面のボタンを無効にするだけでは足りない。
 * 調査研究費のデータを変えるサーバーアクションは、requireRole の代わりに必ずこのガードを最初に通すこと
 * （書き忘れは tests/server/contexts/auth/presentation/loaders/role-guard-coverage.test.ts が検出する）。
 * 議員を引数に取らない操作も、書き込み先のデータの持ち主の議員を渡して判定する。
 */
export async function requireResearchFundWriter(politicianId: string): Promise<AuthUser> {
  const user = await requireRole("research_fund");

  const assignedPoliticianIds = UserRoleModel.isAdmin(user.roles)
    ? []
    : await loadAssignedPoliticianIds(user.id);
  if (!UserRoleModel.canWriteResearchFund(user.roles, assignedPoliticianIds, politicianId)) {
    throw new AuthError("INSUFFICIENT_PERMISSION", "担当外の議員室のため閲覧のみです");
  }

  return user;
}

/**
 * 現在のユーザーが、議員の調査研究費に書き込めるかを判定する関数を返す（画面のボタンの有効・無効に使う）。
 * 未認証なら常に false を返す。サーバー側の拒否は requireResearchFundWriter が担う。
 */
export async function loadResearchFundWritePermission(): Promise<
  (politicianId: string) => boolean
> {
  const user = await getCurrentUser();
  if (!user) return () => false;

  const assignedPoliticianIds = UserRoleModel.isAdmin(user.roles)
    ? []
    : await loadAssignedPoliticianIds(user.id);
  return (politicianId) =>
    UserRoleModel.canWriteResearchFund(user.roles, assignedPoliticianIds, politicianId);
}
