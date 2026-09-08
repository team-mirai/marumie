import "server-only";

import type { AuthProviderName } from "@/server/contexts/auth/domain/models/auth-provider-config";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

/**
 * このサインインで実際に使われた認証プロバイダーの判定結果
 * - password / google: 使われた認証方式を特定できた
 * - null: どちらでもない（招待・パスワードリセットなどのメール経由フロー）
 * - "indeterminate": 認証方式を特定できなかった（認可の判定に使ってはならない）
 */
export type SignInProvider = AuthProviderName | "indeterminate" | null;

/**
 * 認証セッション情報
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: SupabaseAuthUser;
  /**
   * このサインインで実際に使われた認証プロバイダーの判定結果
   */
  signInProvider: SignInProvider;
}
