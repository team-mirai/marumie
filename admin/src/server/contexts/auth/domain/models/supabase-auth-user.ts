import "server-only";

/**
 * Supabase Auth から取得されるユーザー情報（DB の User とは別）
 */
export interface SupabaseAuthUser {
  /** Supabase Auth の user ID（= User.authId） */
  id: string;
  email: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
}
