/** メールアドレスの最大文字数 */
const MAX_LENGTH = 255;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * メールアドレスの形式と正規化（#2131）
 *
 * 招待（ユーザー招待・招待の予約）とパスワードリセット申請で、同じ判定と正規化を使う。
 */
export namespace EmailAddressModel {
  /**
   * メールアドレスを正規化する（前後の空白を除き、小文字にそろえる）。
   * 大文字・小文字の違いで別人として扱わないため、保存も照合もこの形で行う。
   * @returns メールアドレスとして不正な場合（空・形式違い・最大長超え）は null
   */
  export function normalize(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    if (normalized.length > MAX_LENGTH || !EMAIL_PATTERN.test(normalized)) return null;
    return normalized;
  }
}
