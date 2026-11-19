"use server";

import "server-only";
import { redirect } from "next/navigation";
import { LoginWithGoogleUsecase } from "@/server/contexts/auth/application/usecases/login-with-google-usecase";
import { SupabaseAuthProvider } from "@/server/contexts/auth/infrastructure/supabase/supabase-auth-provider";
import { AuthProviderConfig } from "@/server/contexts/auth/domain/models/auth-provider-config";
import { AllowedEmailDomains } from "@/server/contexts/auth/domain/models/allowed-email-domains";
import { AuthError, AUTH_ERROR_MESSAGES } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * Google ログイン開始アクション
 * Supabase の認可 URL へリダイレクトする
 */
export async function loginWithGoogle() {
  // UI の表示制御に加え、アクション自体でもプロバイダー設定を検証する
  const config = AuthProviderConfig.parse(process.env.ADMIN_AUTH_PROVIDERS);
  if (!AuthProviderConfig.isEnabled(config, "google")) {
    redirect(`/login?error=${encodeURIComponent("Google ログインは無効になっています")}`);
  }

  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) {
    console.error("SITE_URL environment variable must be set");
    redirect(`/login?error=${encodeURIComponent(AUTH_ERROR_MESSAGES.NETWORK_ERROR)}`);
  }

  const allowedDomains = AllowedEmailDomains.parse(process.env.AUTH_ALLOWED_EMAIL_DOMAINS);
  const usecase = new LoginWithGoogleUsecase(new SupabaseAuthProvider());

  let url: string;
  try {
    ({ url } = await usecase.execute(`${siteUrl}/api/auth/callback`, allowedDomains));
  } catch (e) {
    const errorMessage =
      e instanceof AuthError
        ? (AUTH_ERROR_MESSAGES[e.code] ?? "認証エラーが発生しました")
        : "認証エラーが発生しました";
    redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect(url);
}
