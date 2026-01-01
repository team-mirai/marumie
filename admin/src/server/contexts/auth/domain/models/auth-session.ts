import "server-only";

import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

/**
 * 認証セッション情報
 */
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: SupabaseAuthUser;
}
