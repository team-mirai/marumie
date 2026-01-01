import "server-only";

/**
 * Admin 専用の認証プロバイダーインターフェース
 * Service Role Key が必要な操作を抽象化する
 * エラー時は AuthError を throw する
 */
export interface AdminAuthProvider {
  /**
   * メールアドレスでユーザーを招待
   * @param email 招待するユーザーのメールアドレス
   * @param redirectTo 招待リンクのリダイレクト先 URL
   * @throws {AuthError} INVITE_FAILED - 招待失敗
   * @throws {AuthError} INVALID_EMAIL - 無効なメールアドレス
   * @throws {AuthError} NETWORK_ERROR - ネットワークエラー
   */
  inviteUserByEmail(email: string, redirectTo: string): Promise<void>;
}
