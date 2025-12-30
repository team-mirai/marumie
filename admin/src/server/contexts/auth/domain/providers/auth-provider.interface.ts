import "server-only";

import type { AuthSession } from "@/server/contexts/auth/domain/models/auth-session";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

/**
 * 認証プロバイダーのインターフェース
 * Supabase Auth の操作を抽象化する
 * エラー時は AuthError を throw する
 */
export interface AuthProvider {
  /**
   * メール/パスワードでサインイン
   * @throws {AuthError} AUTH_FAILED - 認証失敗
   * @throws {AuthError} NETWORK_ERROR - ネットワークエラー
   */
  signInWithPassword(email: string, password: string): Promise<AuthSession>;

  /**
   * サインアウト
   * @throws {AuthError} NETWORK_ERROR - ネットワークエラー
   */
  signOut(): Promise<void>;

  /**
   * 現在のユーザーを取得
   * @returns ユーザー情報、未認証の場合は null
   * @throws {AuthError} NETWORK_ERROR - ネットワークエラー
   */
  getUser(): Promise<SupabaseAuthUser | null>;

  /**
   * ユーザー情報を更新（パスワード変更など）
   * @throws {AuthError} AUTH_FAILED - 更新失敗
   * @throws {AuthError} NETWORK_ERROR - ネットワークエラー
   */
  updateUser(data: { password?: string }): Promise<SupabaseAuthUser>;

  /**
   * セッションを設定（招待からのログイン時に使用）
   * @throws {AuthError} INVALID_TOKEN - 無効なトークン
   * @throws {AuthError} NETWORK_ERROR - ネットワークエラー
   */
  setSession(accessToken: string, refreshToken: string): Promise<AuthSession>;

  /**
   * OAuth コードをセッションに交換
   * @throws {AuthError} INVALID_TOKEN - 無効なコード
   * @throws {AuthError} NETWORK_ERROR - ネットワークエラー
   */
  exchangeCodeForSession(code: string): Promise<AuthSession>;
}
