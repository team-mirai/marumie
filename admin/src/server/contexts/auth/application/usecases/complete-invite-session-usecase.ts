import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/providers/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * 招待セッション完了のユースケース
 * 招待リンクからのトークンを使ってセッションを設定し、必要に応じてユーザーを作成する
 */
export class CompleteInviteSessionUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(accessToken: string, refreshToken: string): Promise<void> {
    if (!accessToken || !refreshToken) {
      throw new AuthError("INVALID_TOKEN", "Access token and refresh token are required");
    }

    try {
      // セッションを設定
      await this.authProvider.setSession(accessToken, refreshToken);

      // 現在のユーザーを取得
      const supabaseUser = await this.authProvider.getUser();
      if (!supabaseUser) {
        throw new AuthError("AUTH_FAILED", "Failed to get user after setting session");
      }

      // DB にユーザーが存在しない場合は作成
      const existing = await this.userRepository.findByAuthId(supabaseUser.id);
      if (!existing && supabaseUser.email) {
        await this.userRepository.create({
          authId: supabaseUser.id,
          email: supabaseUser.email,
          role: "user",
        });
      }
    } catch (e) {
      console.error("Complete invite session failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("INVALID_TOKEN", `Failed to complete invite session: ${String(e)}`, e);
    }
  }
}
