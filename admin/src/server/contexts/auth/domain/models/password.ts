/**
 * パスワードバリデーション結果
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * パスワードのドメインモデル（型定義）
 */
export interface Password {
  value: string;
}

/** パスワードの最小文字数 */
const MIN_LENGTH = 6;

/** パスワードの最大文字数（bcrypt の制限） */
const MAX_LENGTH = 72;

/**
 * Password のドメインロジック
 */
export const Password = {
  MIN_LENGTH,
  MAX_LENGTH,

  /**
   * パスワードが要件を満たしているか検証
   * @param password 検証するパスワード
   * @returns バリデーション結果
   */
  validate(password: string): PasswordValidationResult {
    if (!password || password.trim().length < MIN_LENGTH) {
      return {
        valid: false,
        error: `パスワードは${MIN_LENGTH}文字以上で設定してください`,
      };
    }

    if (password.length > MAX_LENGTH) {
      return {
        valid: false,
        error: `パスワードは${MAX_LENGTH}文字以内で設定してください`,
      };
    }

    return { valid: true };
  },
};
