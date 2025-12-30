"use server";

import { redirect } from "next/navigation";
import { LogoutUsecase } from "@/server/contexts/auth/application/usecases/logout-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";

/**
 * ログアウトアクション（リダイレクト付き）
 */
export async function logout() {
  const authProvider = new SupabaseAuthProvider();
  const usecase = new LogoutUsecase(authProvider);

  await usecase.execute();
  redirect("/login");
}
