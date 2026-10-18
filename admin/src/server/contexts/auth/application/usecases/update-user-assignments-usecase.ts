import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { PoliticianAssignmentModel } from "@/server/contexts/auth/domain/models/politician-assignment";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

/**
 * ユーザーが担当する議員を付け替えるユースケース（admin権限必須。#1773）
 * 渡した議員の集合で担当を置き換え、置き換えた後の担当議員の ID を返す。
 */
export class UpdateUserAssignmentsUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, politicianIds: readonly string[]): Promise<string[]> {
    // 認可チェック
    const authUser = await this.authProvider.getUser();
    if (!authUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }

    const currentUser = await this.userRepository.findByAuthId(authUser.id);

    if (!UserRoleModel.isAdmin(currentUser?.roles ?? [])) {
      throw new AuthError("INSUFFICIENT_PERMISSION", "この操作には管理者権限が必要です");
    }

    let normalizedIds: string[];
    try {
      normalizedIds = PoliticianAssignmentModel.normalize(politicianIds);
    } catch (e) {
      throw new AuthError("INVALID_ASSIGNMENT", e instanceof Error ? e.message : String(e), e);
    }

    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AuthError("USER_NOT_FOUND", "User not found");
      }

      return await this.userRepository.replaceAssignedPoliticians(user.id, normalizedIds);
    } catch (e) {
      console.error(`Update user assignments failed for ${userId}:`, e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to update user assignments: ${String(e)}`, e);
    }
  }
}
