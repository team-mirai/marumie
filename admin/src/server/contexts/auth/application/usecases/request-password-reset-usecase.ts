import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * パスワードリセット申請のユースケース
 */
export class RequestPasswordResetUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(email: string): Promise<void> {
    if (!email) {
      throw new AuthError("INVALID_EMAIL", "Email is required");
    }

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/login`;

    try {
      await this.authProvider.resetPasswordForEmail(email, redirectTo);
    } catch (e) {
      console.error("Request password reset failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("RESET_EMAIL_FAILED", `Failed to send reset email: ${String(e)}`, e);
    }
  }
}
