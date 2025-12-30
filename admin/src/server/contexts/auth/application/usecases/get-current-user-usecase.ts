import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/providers/user-repository.interface";
import type { AuthUser } from "@/server/contexts/auth/domain/models/auth-user";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * 現在のユーザー取得のユースケース
 * Supabase Auth と DB の両方からユーザー情報を取得・同期する
 */
export class GetCurrentUserUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<AuthUser | null> {
    try {
      const supabaseUser = await this.authProvider.getUser();
      if (!supabaseUser) {
        return null;
      }

      let dbUser = await this.userRepository.findByAuthId(supabaseUser.id);

      // DB にユーザーがいない場合は作成
      if (!dbUser && supabaseUser.email) {
        dbUser = await this.userRepository.create({
          authId: supabaseUser.id,
          email: supabaseUser.email,
          role: "user",
        });
      }

      return dbUser;
    } catch (e) {
      console.error("Get current user failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("AUTH_FAILED", `Failed to get current user: ${String(e)}`, e);
    }
  }
}
