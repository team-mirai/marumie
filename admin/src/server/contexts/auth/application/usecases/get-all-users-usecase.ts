import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { UserRoleModel } from "@/server/contexts/auth/domain/models/user-role";

/** ユーザーと、そのユーザーが担当する議員の ID */
export type UserWithAssignments = User & { assignedPoliticianIds: string[] };

/**
 * 全ユーザー一覧取得のユースケース（admin権限必須）
 */
export class GetAllUsersUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * 認可チェック
   * @throws AuthError 認証・認可エラー時
   */
  private async checkPermission(): Promise<void> {
    const authUser = await this.authProvider.getUser();
    if (!authUser) {
      throw new AuthError("AUTH_FAILED", "ログインが必要です");
    }

    const currentUser = await this.userRepository.findByAuthId(authUser.id);

    if (!UserRoleModel.isAdmin(currentUser?.roles ?? [])) {
      throw new AuthError("INSUFFICIENT_PERMISSION", "この操作には管理者権限が必要です");
    }
  }

  async execute(): Promise<UserWithAssignments[]> {
    // 認可チェック
    await this.checkPermission();

    // ユーザー一覧と担当議員を取得
    const [users, assignments] = await Promise.all([
      this.userRepository.findAll(),
      this.userRepository.findAllAssignedPoliticianIds(),
    ]);
    return users.map((user) => ({
      ...user,
      assignedPoliticianIds: assignments.get(user.id) ?? [],
    }));
  }
}
