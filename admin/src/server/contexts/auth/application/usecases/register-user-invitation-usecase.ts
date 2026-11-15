import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { UserInvitationRepository } from "@/server/contexts/auth/domain/repositories/user-invitation-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { PoliticianAssignmentModel } from "@/server/contexts/auth/domain/models/politician-assignment";
import {
  UserInvitationModel,
  type UserInvitation,
} from "@/server/contexts/auth/domain/models/user-invitation";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

/**
 * 初回ログイン前の人に、ロールと担当議員を招待（予約）しておくユースケース（admin権限必須。#1882）
 * 招待メールは送らない。
 */
export class RegisterUserInvitationUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
    private readonly invitationRepository: UserInvitationRepository,
  ) {}

  async execute(
    email: string,
    roles: readonly string[],
    politicianIds: readonly string[],
  ): Promise<UserInvitation> {
    // 認可チェック
    const authUser = await this.authProvider.getUser();
    if (!authUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }
    const currentUser = await this.userRepository.findByAuthId(authUser.id);
    if (!currentUser || !UserRoleModel.isAdmin(currentUser.roles)) {
      throw new AuthError("INSUFFICIENT_PERMISSION", "この操作には管理者権限が必要です");
    }

    const normalizedEmail = UserInvitationModel.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new AuthError("INVALID_EMAIL", "Invalid email format");
    }

    let normalizedRoles: ReturnType<typeof UserRoleModel.normalize>;
    let normalizedPoliticianIds: string[];
    try {
      normalizedRoles = UserRoleModel.normalize(roles);
    } catch (e) {
      throw new AuthError("INVALID_ROLE", e instanceof Error ? e.message : String(e), e);
    }
    try {
      normalizedPoliticianIds = PoliticianAssignmentModel.normalize(politicianIds);
    } catch (e) {
      throw new AuthError("INVALID_ASSIGNMENT", e instanceof Error ? e.message : String(e), e);
    }

    const [existingUser, pendingInvitation] = await Promise.all([
      this.userRepository.findByEmail(normalizedEmail),
      this.invitationRepository.findByEmail(normalizedEmail),
    ]);
    const conflict = UserInvitationModel.findConflict({
      hasUser: existingUser !== null,
      hasPendingInvitation: pendingInvitation !== null,
    });
    if (conflict) {
      throw new AuthError(conflict, `Cannot register invitation: ${conflict}`);
    }

    const invitation = await this.invitationRepository.create({
      email: normalizedEmail,
      roles: normalizedRoles,
      politicianIds: normalizedPoliticianIds,
      createdById: currentUser.id,
    });
    if (!invitation) {
      // 確認と登録の間に、同じメールアドレスの招待が登録された
      throw new AuthError("INVITATION_ALREADY_EXISTS", "Invitation was registered concurrently");
    }
    return invitation;
  }
}
