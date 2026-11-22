"use server";

import { SetupPasswordUsecase } from "@/server/contexts/auth/application/usecases/setup-password-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * パスワード設定アクション
 */
export async function setupPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  const authProvider = new SupabaseAuthProvider();
  const usecase = new SetupPasswordUsecase(authProvider);

  try {
    await usecase.execute(password);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: e.userMessage };
    }
    return { ok: false, error: "パスワードの設定に失敗しました" };
  }
}
