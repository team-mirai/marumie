/**
 * テナントロール（ドメイン層の型定義）
 *
 * const配列 + 型ガード パターンで実装
 * - 新規実装では interface + const パターンを使用するが、
 *   enumはPrismaスキーマと同期するため特別扱い
 */

/** テナントロールの値一覧 */
export const TENANT_ROLES = ["owner", "admin", "editor"] as const;

/** テナントロール型 */
export type TenantRole = (typeof TENANT_ROLES)[number];

/**
 * TenantRole のドメインモデル
 */
export const TenantRoleModel = {
  /**
   * 値がTenantRoleかどうかを検証
   */
  isTenantRole(value: unknown): value is TenantRole {
    return typeof value === "string" && TENANT_ROLES.includes(value as TenantRole);
  },

  /**
   * 指定されたロールが必要な権限を持っているか判定
   * @param currentRole 現在のロール
   * @param requiredRole 必要なロール
   */
  hasPermission(currentRole: TenantRole, requiredRole: TenantRole): boolean {
    const hierarchy: Record<TenantRole, number> = {
      owner: 3,
      admin: 2,
      editor: 1,
    };
    return hierarchy[currentRole] >= hierarchy[requiredRole];
  },

  /**
   * owner権限を持っているか判定
   */
  isOwner(role: TenantRole): boolean {
    return role === "owner";
  },

  /**
   * admin以上の権限を持っているか判定
   */
  isAdminOrAbove(role: TenantRole): boolean {
    return role === "owner" || role === "admin";
  },
} as const;
