import "server-only";

import { NextResponse } from "next/server";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";
import { getCurrentUser } from "@/server/contexts/auth/presentation/loaders/load-current-user";
import type { AllowedRoles } from "@/server/contexts/auth/presentation/loaders/require-role";

/**
 * Route Handler 用のロールガード（admin は常に通る）。
 *
 * 未認証なら 401、ロールが足りなければ 403 の NextResponse を返すので、
 * 呼び出し側は返り値が非 null ならそのまま return すること。通過した場合は null を返す。
 */
export async function requireRoleResponse(...allowed: AllowedRoles): Promise<NextResponse | null> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  if (!UserRoleModel.canUse(user.roles, allowed)) {
    return NextResponse.json({ error: "この機能を使う権限がありません" }, { status: 403 });
  }

  return null;
}
