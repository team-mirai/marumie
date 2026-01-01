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
        // パスワードリセット時の AUTH_FAILED は SESSION_EXPIRED として扱う
        if (e.code === "AUTH_FAILED") {
          throw new AuthError(
            "SESSION_EXPIRED",
            "Password reset session expired. Please request a new password reset email.",
            e,
          );
        }
        throw e;
      }
      throw new AuthError("SESSION_EXPIRED", `Failed to reset password: ${String(e)}`, e);
    }
  }
}
