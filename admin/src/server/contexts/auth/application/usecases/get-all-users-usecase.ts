import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { validateRole } from "@/server/contexts/auth/domain/services/role-validator";

/**
 * 全ユーザー一覧取得のユースケース（admin権限必須）
 */
export class GetAllUsersUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<User[]> {
    // 認可チェック
    const authUser = await this.authProvider.getUser();
    if (!authUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }

    const currentUser = await this.userRepository.findByAuthId(authUser.id);
    const currentRole = currentUser?.role ?? "user";

    const roleResult = validateRole(currentRole, "admin");
    if (!roleResult.valid) {
      throw new AuthError("INSUFFICIENT_PERMISSION", "この操作には管理者権限が必要です");
    }

    // ユーザー一覧取得
    try {
      return await this.userRepository.findAll();
    } catch (e) {
      console.error("Get all users failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to get all users: ${String(e)}`, e);
    }
  }
}
