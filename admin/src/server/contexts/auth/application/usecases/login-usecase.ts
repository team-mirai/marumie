import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AuthSession } from "@/server/contexts/auth/domain/models/auth-session";
import { AuthProviderConfig } from "@/server/contexts/auth/domain/models/auth-provider-config";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ログイン処理のユースケース
 */
export class LoginUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly providerConfig: AuthProviderConfig,
  ) {}

  async execute(email: string, password: string): Promise<AuthSession> {
    // ログイン画面を経由しない直接呼び出しでも、無効化された認証方式は拒否する
    if (!AuthProviderConfig.isEnabled(this.providerConfig, "password")) {
      throw new AuthError("PROVIDER_DISABLED", "Password login is disabled");
    }

    if (!email || !password) {
      throw new AuthError("AUTH_FAILED", "Email and password are required");
    }

    try {
      return await this.authProvider.signInWithPassword(email, password);
    } catch (e) {
      if (e instanceof AuthError) {
        // 認証エラーは予期される失敗なのでログ出力しない
        throw e;
      }
      // 予期しないエラーのみスタックトレース付きでログ
      console.error("Unexpected login error:", e);
      throw new AuthError(
        "AUTH_FAILED",
        `Failed to login: ${e instanceof Error ? e.message : String(e)}`,
        e,
      );
    }
  }
}
