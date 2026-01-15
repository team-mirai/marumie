import "server-only";

/**
 * テナント（契約・管理単位）
 * 政党や個人議員事務所など、利用者の最上位の管理単位
 */
export interface Tenant {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant のドメインモデル
 */
export const TenantModel = {
  /**
   * slug のバリデーション
   * - 英小文字、数字、ハイフンのみ
   * - 3〜50文字
   */
  validateSlug(slug: string): { valid: boolean; message?: string } {
    if (slug.length < 3 || slug.length > 50) {
      return { valid: false, message: "slugは3〜50文字で指定してください" };
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        valid: false,
        message: "slugは英小文字、数字、ハイフンのみ使用できます",
      };
    }
    if (slug.startsWith("-") || slug.endsWith("-")) {
      return {
        valid: false,
        message: "slugの先頭・末尾にハイフンは使用できません",
      };
    }
    return { valid: true };
  },
} as const;
