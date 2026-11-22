import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { EmailAddressModel } from "@/server/contexts/auth/domain/models/email-address";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * パスワードリセット申請のユースケース
 */
export class RequestPasswordResetUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(email: string): Promise<void> {
    const normalizedEmail = EmailAddressModel.normalize(email);
    if (!normalizedEmail) {
      throw new AuthError("INVALID_EMAIL", "Invalid email format");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new AuthError("NETWORK_ERROR", "NEXT_PUBLIC_APP_URL environment variable must be set");
    }
    const redirectTo = `${appUrl}/login`;

    try {
      await this.authProvider.resetPasswordForEmail(normalizedEmail, redirectTo);
    } catch (e) {
      console.error("Request password reset failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("RESET_EMAIL_FAILED", `Failed to send reset email: ${String(e)}`, e);
    }
  }
}
