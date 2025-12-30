"use server";

import { redirect } from "next/navigation";
import { LoginUsecase } from "@/server/contexts/auth/application/usecases/login-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ログインアクション
 */
export async function loginWithPassword(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  const authProvider = new SupabaseAuthProvider();
  const usecase = new LoginUsecase(authProvider);

  try {
    await usecase.execute(email, password);
    redirect("/");
  } catch (e) {
    if (e instanceof AuthError) {
      const errorMessage = AUTH_ERROR_MESSAGES[e.code] ?? "認証エラーが発生しました";
      redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
    }
    redirect(`/login?error=${encodeURIComponent("認証エラーが発生しました")}`);
  }
}
