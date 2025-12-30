import "server-only";

import type { AdminAuthProvider } from "@/server/contexts/auth/domain/providers/admin-auth-provider.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ユーザー招待のユースケース
 */
export class InviteUserUsecase {
  constructor(private readonly adminAuthProvider: AdminAuthProvider) {}

  async execute(email: string): Promise<void> {
    // メールアドレスのバリデーション
    if (!email || typeof email !== "string") {
      throw new AuthError("INVALID_EMAIL", "Email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AuthError("INVALID_EMAIL", "Invalid email format");
    }

    const redirectTo = `${process.env.SITE_URL || "http://localhost:3001"}/auth/callback`;

    try {
      await this.adminAuthProvider.inviteUserByEmail(email, redirectTo);
    } catch (e) {
      console.error(`Invite user failed for ${email}:`, e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("INVITE_FAILED", `Failed to invite user: ${String(e)}`, e);
    }
  }
}
