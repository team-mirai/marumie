import "server-only";

import type { UserRole } from "@prisma/client";

/**
 * ロール検証結果
 */
export interface RoleValidationResult {
  valid: boolean;
  reason?: "INSUFFICIENT_PERMISSION";
}

/**
 * ロール検証のビジネスルール
 * @param currentRole 現在のユーザーロール
 * @param requiredRole 必要なロール
 * @returns 検証結果
 */
export function validateRole(currentRole: UserRole, requiredRole: UserRole): RoleValidationResult {
  // admin ロールが必要な場合、現在のロールが admin であること
  if (requiredRole === "admin" && currentRole !== "admin") {
    return { valid: false, reason: "INSUFFICIENT_PERMISSION" };
  }

  // user ロールは全てのロールで許可
  return { valid: true };
}
