import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AdminAuthProvider } from "@/server/contexts/auth/domain/providers/admin-auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { validateRole } from "@/server/contexts/auth/domain/services/role-validator";

/**
 * ユーザー招待のユースケース（admin権限必須）
 */
export class InviteUserUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
    private readonly adminAuthProvider: AdminAuthProvider,
  ) {}

  async execute(email: string): Promise<void> {
    // 認可チェック
    const supabaseUser = await this.authProvider.getUser();
    if (!supabaseUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }

    const currentUser = await this.userRepository.findByAuthId(supabaseUser.id);
    const currentRole = currentUser?.role ?? "user";

    const roleResult = validateRole(currentRole, "admin");
    if (!roleResult.valid) {
      throw new AuthError("INSUFFICIENT_PERMISSION", "この操作には管理者権限が必要です");
    }

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
