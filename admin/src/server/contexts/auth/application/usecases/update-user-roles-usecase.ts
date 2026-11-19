import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

/**
 * ユーザーのロール（複数）更新のユースケース（admin権限必須）
 */
export class UpdateUserRolesUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, roles: readonly string[]): Promise<User> {
    // 認可チェック
    const authUser = await this.authProvider.getUser();
    if (!authUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }

    const currentUser = await this.userRepository.findByAuthId(authUser.id);

    if (!UserRoleModel.isAdmin(currentUser?.roles ?? [])) {
      throw new AuthError("INSUFFICIENT_PERMISSION", "この操作には管理者権限が必要です");
    }

    let normalizedRoles: ReturnType<typeof UserRoleModel.normalize>;
    try {
      normalizedRoles = UserRoleModel.normalize(roles);
    } catch (e) {
      throw new AuthError("INVALID_ROLE", e instanceof Error ? e.message : String(e), e);
    }

    try {
      // まず userId から user を取得
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AuthError("USER_NOT_FOUND", "User not found");
      }

      // authId でロールを更新
      return await this.userRepository.updateRoles(user.authId, normalizedRoles);
    } catch (e) {
      console.error(`Update user roles failed for ${userId}:`, e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to update user roles: ${String(e)}`, e);
    }
  }
}
