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

  async execute(email: string, roles: readonly string[]): Promise<void> {
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

    if (!UserRoleModel.isAdmin(currentUser.roles)) {
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

    let normalizedRoles: ReturnType<typeof UserRoleModel.normalize>;
    try {
      normalizedRoles = UserRoleModel.normalize(roles);
    } catch (e) {
      throw new AuthError("INVALID_ROLE", e instanceof Error ? e.message : String(e), e);
    }

    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) {
      throw new AuthError("NETWORK_ERROR", "SITE_URL environment variable must be set");
    }
    const redirectTo = `${siteUrl}/auth/callback`;

    let invitedAuthId: string;
    try {
      ({ authId: invitedAuthId } = await this.adminAuthProvider.inviteUserByEmail(
        email,
        redirectTo,
      ));
    } catch (e) {
      console.error("Invite user failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("INVITE_FAILED", `Failed to invite user: ${String(e)}`, e);
    }

    // 招待時に選んだロールを初回ログイン前から持たせるため、DB のユーザーをここで作っておく
    // （作らないと初回ログインでロールなしのユーザーとして作られる）
    const invitedUser = await this.userRepository.findByAuthId(invitedAuthId);
    if (invitedUser) {
      await this.userRepository.updateRoles(invitedAuthId, normalizedRoles);
    } else {
      await this.userRepository.create({ authId: invitedAuthId, email, roles: normalizedRoles });
    }
  }
}
