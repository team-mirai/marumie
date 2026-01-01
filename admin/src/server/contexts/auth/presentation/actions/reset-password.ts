"use server";

import { ResetPasswordUsecase } from "@/server/contexts/auth/application/usecases/reset-password-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * パスワードリセット（新しいパスワードを設定）アクション
 */
export async function resetPassword(
  password: string,
): Promise<{ ok: boolean; error?: string; redirectTo?: string }> {
  const authProvider = new SupabaseAuthProvider();
  const usecase = new ResetPasswordUsecase(authProvider);

  try {
    await usecase.execute(password);
    // パスワードリセット後はセッションをクリアしてログイン画面へ
    await authProvider.signOut();
    return { ok: true, redirectTo: "/login" };
  } catch (e) {
    if (e instanceof AuthError) {
      const errorMessage = AUTH_ERROR_MESSAGES[e.code] ?? e.message;
      return { ok: false, error: errorMessage };
    }
    return { ok: false, error: "パスワードの設定に失敗しました" };
  }
}
