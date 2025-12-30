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
      console.error("Login failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to login: ${String(e)}`, e);
    }
  }
}
