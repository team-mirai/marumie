import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AllowedEmailDomains } from "@/server/contexts/auth/domain/models/allowed-email-domains";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * Google ログイン開始のユースケース
 * 認可 URL を取得して返す（リダイレクトは presentation 層で行う）
 */
export class LoginWithGoogleUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(redirectTo: string, allowedDomains: AllowedEmailDomains): Promise<{ url: string }> {
    // 許可ドメインが 1 件のみの場合は hd パラメータでアカウント選択を絞り込む。
    // UX 改善が目的であり、実際の強制は ExchangeCodeForSessionUsecase 側で行う
    const queryParams =
      allowedDomains.domains.length === 1 ? { hd: allowedDomains.domains[0] } : undefined;

    try {
      return await this.authProvider.signInWithOAuth("google", { redirectTo, queryParams });
    } catch (e) {
      if (e instanceof AuthError) {
        throw e;
      }
      console.error("Unexpected Google login error:", e);
      throw new AuthError(
        "AUTH_FAILED",
        `Failed to start Google login: ${e instanceof Error ? e.message : String(e)}`,
        e,
      );
    }
  }
}
