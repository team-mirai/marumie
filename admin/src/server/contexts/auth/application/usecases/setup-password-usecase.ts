import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { Password } from "@/server/contexts/auth/domain/models/password";

/**
 * パスワード設定のユースケース
 */
export class SetupPasswordUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(password: string): Promise<void> {
    const validation = Password.validate(password);
    if (!validation.valid) {
      throw AuthError.rejected("WEAK_PASSWORD", validation.error);
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
