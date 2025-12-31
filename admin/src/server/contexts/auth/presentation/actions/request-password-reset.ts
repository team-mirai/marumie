"use server";

import { redirect } from "next/navigation";
import { RequestPasswordResetUsecase } from "@/server/contexts/auth/application/usecases/request-password-reset-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";

/**
 * パスワードリセット申請アクション
 */
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;

  const authProvider = new SupabaseAuthProvider();
  const usecase = new RequestPasswordResetUsecase(authProvider);

  try {
    await usecase.execute(email);
  } catch (e) {
    console.error("Request password reset error:", e);
  }

  // パスワードリセットを申請した時点で既存セッションをクリア
  // これにより、リセットリンクが期限切れでもログイン状態が維持されることを防ぐ
  try {
    await authProvider.signOut();
  } catch {
    // サインアウト失敗は無視（未ログイン状態の場合もある）
  }

  redirect("/forgot-password?sent=true");
}
