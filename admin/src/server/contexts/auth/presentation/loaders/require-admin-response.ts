import "server-only";

import { NextResponse } from "next/server";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";

/**
 * Route Handler 用の admin ロールガード。
 *
 * 未認証なら 401、admin 以外なら 403 の NextResponse を返すので、
 * 呼び出し側は返り値が非 null ならそのまま return すること。admin の場合は null を返す。
 *
 * proxy (middleware) はロールを見ないため、admin 限定の Route Handler では必ずこれを通す。
 */
export async function requireAdminResponse(): Promise<NextResponse | null> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  if (!UserRoleModel.isAdmin(user.role)) {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  return null;
}
