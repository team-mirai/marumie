"use server";

import { CompleteRecoverySessionUsecase } from "@/server/contexts/auth/application/usecases/complete-recovery-session-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * リカバリーセッション完了アクション
 * パスワードリセットフロー専用のセッション確立
 * 招待フローと異なり、ユーザー作成やキャッシュ無効化は行わない
 */
export async function completeRecoverySession(
  accessToken: string,
  refreshToken: string,
): Promise<{ ok: boolean; error?: string }> {
  const authProvider = new SupabaseAuthProvider();
  const usecase = new CompleteRecoverySessionUsecase(authProvider);

  try {
    await usecase.execute(accessToken, refreshToken);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      const errorMessage = AUTH_ERROR_MESSAGES[e.code] ?? e.message;
      return { ok: false, error: errorMessage };
    }
    return { ok: false, error: "セッションの設定に失敗しました" };
  }
}
