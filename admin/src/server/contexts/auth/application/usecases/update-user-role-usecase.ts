import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { UserRole } from "@prisma/client";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

/**
 * ユーザーロール更新のユースケース（admin権限必須）
 */
export class UpdateUserRoleUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, role: UserRole): Promise<User> {
    // 認可チェック
    const authUser = await this.authProvider.getUser();
    if (!authUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }

    const currentUser = await this.userRepository.findByAuthId(authUser.id);
    const currentRole = currentUser?.role ?? "user";

    if (!UserRoleModel.hasPermission(currentRole, "admin")) {
      throw new AuthError("INSUFFICIENT_PERMISSION", "この操作には管理者権限が必要です");
    }

    try {
      // まず userId から user を取得
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AuthError("USER_NOT_FOUND", "User not found");
      }

      // authId でロールを更新
      return await this.userRepository.updateRole(user.authId, role);
    } catch (e) {
      console.error(`Update user role failed for ${userId}:`, e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to update user role: ${String(e)}`, e);
    }
  }
}
