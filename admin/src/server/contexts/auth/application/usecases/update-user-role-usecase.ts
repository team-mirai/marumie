import "server-only";

import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/providers/user-repository.interface";
import type { UserRole } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * ユーザーロール更新のユースケース
 */
export class UpdateUserRoleUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaClient,
  ) {}

  async execute(userId: string, role: UserRole): Promise<User> {
    try {
      // まず userId から user を取得
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
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
