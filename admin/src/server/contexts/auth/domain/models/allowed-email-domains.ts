/**
 * ログインを許可するメールドメインのリスト
 * リストが空の場合は制限なし（すべて許可）
 */
export interface AllowedEmailDomains {
  domains: string[];
}

export const AllowedEmailDomains = {
  /**
   * カンマ区切りの設定値（例: "team-mir.ai,example.com"）をパースする
   * 未設定・空文字の場合は制限なしとして空リストを返す
   */
  parse(value: string | undefined): AllowedEmailDomains {
    const domains = (value ?? "")
      .split(",")
      .map((domain) => domain.trim().toLowerCase())
      .filter((domain) => domain.length > 0);
    return { domains };
  },

  /**
   * メールアドレスのドメインが許可リストに含まれるか判定する
   * 許可リストが空の場合は常に許可
   */
  isAllowed(allowed: AllowedEmailDomains, email: string | null): boolean {
    if (allowed.domains.length === 0) {
      return true;
    }
    const atIndex = email?.lastIndexOf("@") ?? -1;
    if (email === null || atIndex < 0) {
      return false;
    }
    const domain = email.slice(atIndex + 1).toLowerCase();
    return allowed.domains.includes(domain);
  },
};
