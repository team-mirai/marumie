/**
 * ユーザーロール（ドメイン層の型定義）
 * Prisma の UserRole と同等の値を持つが、ドメイン層で独自に定義することで依存性逆転を実現
 *
 * ロールは「使える業務」を表し、1 ユーザーに複数付けられる。
 * - admin: 全機能（ユーザー管理・議員の登録・同期用エクスポート/インポートを含む）
 * - political_fund: 政治資金（政治団体・取引・報告書など）
 * - research_fund: 調査研究費（議員の年度帳簿・書類スキャン・仕訳など）
 */
export type UserRole = "admin" | "political_fund" | "research_fund";

/** 画面での表示順を兼ねたロールの一覧 */
export const USER_ROLES: readonly UserRole[] = ["admin", "political_fund", "research_fund"];

/**
 * UserRole のドメインモデル
 * ロールに関するビジネスルールを集約
 */
export namespace UserRoleModel {
  /**
   * 指定されたロールのいずれかで使える機能を使えるか判定する。
   * admin は他のロールの有無に関係なく全機能を使える。
   * @param roles 現在のユーザーのロール
   * @param allowed 機能を使えるロール（どれか 1 つを持っていればよい）
   */
  export function canUse(roles: readonly UserRole[], allowed: readonly UserRole[]): boolean {
    if (isAdmin(roles)) return true;
    return allowed.some((role) => roles.includes(role));
  }

  /**
   * 管理者権限を持っているか判定
   * @param roles ユーザーのロール
   * @returns 管理者の場合は true
   */
  export function isAdmin(roles: readonly UserRole[]): boolean {
    return roles.includes("admin");
  }

  /** どの機能も使えない（ロールを 1 つも持たない）か判定 */
  export function hasNoRole(roles: readonly UserRole[]): boolean {
    return roles.length === 0;
  }

  /**
   * 入力されたロールの集合を正規化する（未知の値の拒否・重複の除去・表示順への並べ替え）。
   * @throws Error 未知のロールが含まれる場合
   */
  export function normalize(roles: readonly string[]): UserRole[] {
    const unknown = roles.filter((role) => !(USER_ROLES as readonly string[]).includes(role));
    if (unknown.length > 0) {
      throw new Error(`不明なロールです: ${unknown.join(", ")}`);
    }
    return USER_ROLES.filter((role) => roles.includes(role));
  }
}
