import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { UserInvitationRepository } from "@/server/contexts/auth/domain/repositories/user-invitation-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

/**
 * 未使用の招待を取り消すユースケース（admin権限必須。#1882）
 */
export class CancelUserInvitationUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
    private readonly invitationRepository: UserInvitationRepository,
  ) {}

  async execute(invitationId: string): Promise<void> {
    // 認可チェック
    const authUser = await this.authProvider.getUser();
    if (!authUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }
    const currentUser = await this.userRepository.findByAuthId(authUser.id);
    if (!UserRoleModel.isAdmin(currentUser?.roles ?? [])) {
      throw new AuthError("INSUFFICIENT_PERMISSION", "この操作には管理者権限が必要です");
    }

    const deleted = await this.invitationRepository.delete(invitationId);
    if (!deleted) {
      throw new AuthError("INVITATION_NOT_FOUND", "Invitation not found");
    }
  }
}
