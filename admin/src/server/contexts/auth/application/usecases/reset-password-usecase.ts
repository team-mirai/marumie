import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { Password } from "@/server/contexts/auth/domain/models/password";

/**
 * パスワードリセット（新しいパスワードを設定）のユースケース
 */
export class ResetPasswordUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(password: string): Promise<void> {
    const validation = Password.validate(password);
    if (!validation.valid) {
      throw new AuthError("WEAK_PASSWORD", validation.error ?? "Invalid password");
    }

    try {
      await this.authProvider.updateUser({ password });
    } catch (e) {
      console.error("Reset password failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to reset password: ${String(e)}`, e);
    }
  }
}
