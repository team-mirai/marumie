"use server";

import { redirect } from "next/navigation";
import { LogoutUsecase } from "@/server/contexts/auth/application/usecases/logout-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/repositories/supabase-auth-provider";

/**
 * ログアウトアクション（リダイレクト付き）
 */
export async function logout() {
  const authProvider = new SupabaseAuthProvider();
  const usecase = new LogoutUsecase(authProvider);

  await usecase.execute();
  redirect("/login");
}

/**
 * サインアウト処理（API ルート用、リダイレクトなし）
 */
export async function signOut(): Promise<{ ok: boolean; error?: string }> {
  const authProvider = new SupabaseAuthProvider();
  const usecase = new LogoutUsecase(authProvider);

  try {
    await usecase.execute();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Logout failed" };
  }
}
