import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/repositories/auth-provider.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ログアウト処理のユースケース
 */
export class LogoutUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(): Promise<void> {
    try {
      await this.authProvider.signOut();
    } catch (e) {
      console.error("Logout failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to logout: ${String(e)}`, e);
    }
  }
}
