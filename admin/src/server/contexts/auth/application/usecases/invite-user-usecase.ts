import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AdminAuthProvider } from "@/server/contexts/auth/domain/providers/admin-auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

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
    const authUser = await this.authProvider.getUser();
    if (!authUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }

    const currentUser = await this.userRepository.findByAuthId(authUser.id);
    if (!currentUser) {
      console.warn(`User not found in DB for authId: ${authUser.id}`);
      throw new AuthError("USER_NOT_FOUND", "ユーザー情報が見つかりません");
    }
    const currentRole = currentUser.role;

    if (!UserRoleModel.hasPermission(currentRole, "admin")) {
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

    // SITE_URLのバリデーション（本番環境では必須）
    const siteUrl = process.env.SITE_URL;
    if (!siteUrl && process.env.NODE_ENV === "production") {
      throw new AuthError(
        "NETWORK_ERROR",
        "SITE_URL environment variable must be set in production",
      );
    }
    const redirectTo = `${siteUrl || "http://localhost:3001"}/auth/callback`;

    try {
      await this.adminAuthProvider.inviteUserByEmail(email, redirectTo);
    } catch (e) {
      console.error("Invite user failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("INVITE_FAILED", `Failed to invite user: ${String(e)}`, e);
    }
  }
}
