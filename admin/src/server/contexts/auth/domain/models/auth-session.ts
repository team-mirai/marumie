import "server-only";

import type { AuthProviderName } from "@/server/contexts/auth/domain/models/auth-provider-config";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

/**
 * 認証セッション情報
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: SupabaseAuthUser;
  /**
   * このサインインで実際に使われた認証プロバイダー。
   * password / google のいずれでもない場合は null
   * （招待・パスワードリセットなどのメール経由フローを含む）
   */
  signInProvider: AuthProviderName | null;
}
