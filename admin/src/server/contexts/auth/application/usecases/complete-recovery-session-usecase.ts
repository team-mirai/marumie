import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

/**
 * リカバリーセッション完了のユースケース
 * パスワードリセットリンクからのトークンを使ってセッションを設定する
 * 招待フローと異なり、ユーザー作成は行わない（既存ユーザーのパスワードリセットのため）
 */
export class CompleteRecoverySessionUsecase {
  constructor(private readonly authProvider: AuthProvider) {}

  async execute(accessToken: string, refreshToken: string): Promise<void> {
    if (!accessToken || !refreshToken) {
      throw new AuthError("INVALID_TOKEN", "Access token and refresh token are required");
    }

    try {
      // セッションを設定
      await this.authProvider.setSession(accessToken, refreshToken);

      // 現在のユーザーを取得して検証
      const authUser = await this.authProvider.getUser();
      if (!authUser) {
        throw new AuthError("AUTH_FAILED", "Failed to get user after setting session");
      }
    } catch (e) {
      console.error("Complete recovery session failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("INVALID_TOKEN", `Failed to complete recovery session: ${String(e)}`, e);
    }
  }
}
