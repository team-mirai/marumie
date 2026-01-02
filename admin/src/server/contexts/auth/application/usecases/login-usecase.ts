import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AuthSession } from "@/server/contexts/auth/domain/models/auth-session";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ログイン処理のユースケース
 */
export class LoginUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(email: string, password: string): Promise<AuthSession> {
    if (!email || !password) {
      throw new AuthError("AUTH_FAILED", "Email and password are required");
    }

    try {
      return await this.authProvider.signInWithPassword(email, password);
    } catch (e) {
      if (e instanceof AuthError) {
        // 認証エラーは予期される失敗なのでスタックトレースなしでログ
        console.warn(`Login failed for ${email}: ${e.message}`);
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
