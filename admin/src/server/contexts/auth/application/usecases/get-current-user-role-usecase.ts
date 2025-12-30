import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/repositories/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { UserRole } from "@prisma/client";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * 現在のユーザーロール取得のユースケース
 */
export class GetCurrentUserRoleUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<UserRole | null> {
    try {
      const supabaseUser = await this.authProvider.getUser();
      if (!supabaseUser) {
        return null;
      }

      const dbUser = await this.userRepository.findByAuthId(supabaseUser.id);
      if (dbUser) {
        return dbUser.role;
      }

      // DB にユーザーがいない場合はデフォルトロール
      return "user";
    } catch (e) {
      console.error("Get current user role failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to get current user role: ${String(e)}`, e);
    }
  }
}
