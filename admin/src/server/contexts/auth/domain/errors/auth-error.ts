import "server-only";

/**
 * 認証エラーコードの型定義（網羅性チェック用）
 */
export type AuthErrorCode =
  | "AUTH_FAILED"
  | "SESSION_EXPIRED"
  | "INVALID_TOKEN"
  | "NETWORK_ERROR"
  | "INSUFFICIENT_PERMISSION"
  | "USER_NOT_FOUND"
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "INVITE_FAILED";

/**
 * 認証エラークラス（単一クラス + code パターン）
 */
export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * ユーザー向けメッセージ変換マップ（Presentation 層で使用）
 */
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  AUTH_FAILED: "メールアドレスまたはパスワードが正しくありません",
  SESSION_EXPIRED: "セッションの有効期限が切れました。再度ログインしてください",
  INVALID_TOKEN: "認証情報が無効です。再度ログインしてください",
  NETWORK_ERROR: "認証サービスに接続できませんでした。しばらく待ってから再試行してください",
  INSUFFICIENT_PERMISSION: "この操作を行う権限がありません",
  USER_NOT_FOUND: "ユーザーが見つかりません",
  INVALID_EMAIL: "有効なメールアドレスを入力してください",
  WEAK_PASSWORD: "パスワードは6文字以上で入力してください",
  INVITE_FAILED: "招待メールの送信に失敗しました",
};
