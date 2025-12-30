import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * 現在のユーザー取得のユースケース
 * 認証プロバイダと DB の両方からユーザー情報を取得・同期する
 */
export class GetCurrentUserUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<AuthUser | null> {
    try {
      const authUser = await this.authProvider.getUser();
      if (!authUser) {
        return null;
      }

      let user = await this.userRepository.findByAuthId(authUser.id);

      // DB にユーザーがいない場合は作成
      if (!user && authUser.email) {
        user = await this.userRepository.create({
          authId: authUser.id,
          email: authUser.email,
          role: "user",
        });
      }

      return user;
    } catch (e) {
      console.error("Get current user failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to get current user: ${String(e)}`, e);
    }
  }
}
