import "server-only";

import type { UserRole } from "@prisma/client";

/**
 * UserRole のドメインモデル
 * ロールに関するビジネスルールを集約
 */
export namespace UserRoleModel {
  /**
   * 指定されたロールの権限を持っているか判定
   * @param currentRole 現在のユーザーロール
   * @param requiredRole 必要なロール
   * @returns 権限がある場合は true
   */
  export function hasPermission(currentRole: UserRole, requiredRole: UserRole): boolean {
    // admin ロールが必要な場合、現在のロールが admin であること
    if (requiredRole === "admin") {
      return currentRole === "admin";
    }

    // user ロールは全てのロールで許可
    return true;
  }

  /**
   * 管理者権限を持っているか判定
   * @param role ユーザーロール
   * @returns 管理者の場合は true
   */
  export function isAdmin(role: UserRole): boolean {
    return role === "admin";
  }
}

export type { UserRole } from "@prisma/client";
