import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * パスワード設定のユースケース
 */
export class SetupPasswordUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(password: string): Promise<void> {
    // パスワードのバリデーション
    if (!password || password.length < 6) {
      throw new AuthError("WEAK_PASSWORD", "Password must be at least 6 characters");
    }

    try {
      await this.authProvider.updateUser({ password });
    } catch (e) {
      console.error("Setup password failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to setup password: ${String(e)}`, e);
    }
  }
}
