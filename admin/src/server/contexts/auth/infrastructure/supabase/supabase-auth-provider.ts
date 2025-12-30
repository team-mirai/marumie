import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AdminAuthProvider } from "@/server/contexts/auth/domain/providers/admin-auth-provider.interface";
import type { AuthSession } from "@/server/contexts/auth/domain/models/auth-session";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { createSupabaseClient } from "@/server/contexts/auth/infrastructure/supabase/supabase-client";
import { createSupabaseAdminClient } from "@/server/contexts/auth/infrastructure/supabase/supabase-admin-client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

/**
 * Supabase User を SupabaseAuthUser に変換
 */
function mapToSupabaseAuthUser(user: SupabaseUser): SupabaseAuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

/**
 * Supabase Session を AuthSession に変換
 */
function mapToAuthSession(session: Session): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user: mapToSupabaseAuthUser(session.user),
  };
}

/**
 * AuthProvider インターフェースの Supabase 実装
 */
export class SupabaseAuthProvider implements AuthProvider {
  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    try {
      const supabase = await createSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new AuthError("AUTH_FAILED", error.message, error);
      }

      if (!data.session) {
        throw new AuthError("AUTH_FAILED", "No session returned");
      }

      return mapToAuthSession(data.session);
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("NETWORK_ERROR", "認証サービスに接続できません", e);
    }
  }

  async signOut(): Promise<void> {
    try {
      const supabase = await createSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new AuthError("AUTH_FAILED", error.message, error);
      }
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("NETWORK_ERROR", "認証サービスに接続できません", e);
    }
  }

  async getUser(): Promise<SupabaseAuthUser | null> {
    try {
      const supabase = await createSupabaseClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        // ユーザーが存在しない場合（401）はエラーではなく null を返す
        if (error.status === 401) {
          return null;
        }
        throw new AuthError("AUTH_FAILED", error.message, error);
      }

      if (!user) {
        return null;
      }

      return mapToSupabaseAuthUser(user);
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("NETWORK_ERROR", "認証サービスに接続できません", e);
    }
  }

  async updateUser(data: { password?: string }): Promise<SupabaseAuthUser> {
    try {
      const supabase = await createSupabaseClient();
      const { data: result, error } = await supabase.auth.updateUser({
        password: data.password,
        data: data.password ? { password_set: true } : undefined,
      });

      if (error) {
        throw new AuthError("AUTH_FAILED", error.message, error);
      }

      if (!result.user) {
        throw new AuthError("AUTH_FAILED", "No user returned");
      }

      return mapToSupabaseAuthUser(result.user);
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("NETWORK_ERROR", "認証サービスに接続できません", e);
    }
  }

  async setSession(accessToken: string, refreshToken: string): Promise<AuthSession> {
    try {
      const supabase = await createSupabaseClient();
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        throw new AuthError("INVALID_TOKEN", error.message, error);
      }

      if (!data.session) {
        throw new AuthError("INVALID_TOKEN", "No session returned");
      }

      return mapToAuthSession(data.session);
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("NETWORK_ERROR", "認証サービスに接続できません", e);
    }
  }

  async exchangeCodeForSession(code: string): Promise<AuthSession> {
    try {
      const supabase = await createSupabaseClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw new AuthError("INVALID_TOKEN", error.message, error);
      }

      if (!data.session) {
        throw new AuthError("INVALID_TOKEN", "No session returned");
      }

      return mapToAuthSession(data.session);
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("NETWORK_ERROR", "認証サービスに接続できません", e);
    }
  }
}

/**
 * AdminAuthProvider インターフェースの Supabase 実装
 */
export class SupabaseAdminAuthProvider implements AdminAuthProvider {
  async inviteUserByEmail(email: string, redirectTo: string): Promise<void> {
    try {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });

      if (error) {
        // メールアドレスの形式エラーを判定（validation_failed コードで判定）
        if (error.code === "validation_failed") {
          throw new AuthError("INVALID_EMAIL", error.message, error);
        }
        throw new AuthError("INVITE_FAILED", error.message, error);
      }
    } catch (e) {
      if (e instanceof AuthError) throw e;
      throw new AuthError("NETWORK_ERROR", "認証サービスに接続できません", e);
    }
  }
}
