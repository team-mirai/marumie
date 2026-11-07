import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { UserInvitationRepository } from "@/server/contexts/auth/domain/repositories/user-invitation-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { UserInvitationModel } from "@/server/contexts/auth/domain/models/user-invitation";

/**
 * 招待セッション完了のユースケース
 * 招待リンクからのトークンを使ってセッションを設定し、必要に応じてユーザーを作成する
 */
export class CompleteInviteSessionUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
    private readonly invitationRepository: UserInvitationRepository,
  ) {}

  async execute(accessToken: string, refreshToken: string): Promise<void> {
    if (!accessToken || !refreshToken) {
      throw new AuthError("INVALID_TOKEN", "Access token and refresh token are required");
    }

    try {
      // セッションを設定
      const session = await this.authProvider.setSession(accessToken, refreshToken);

      // 現在のユーザーを取得
      const authUser = await this.authProvider.getUser();
      if (!authUser) {
        throw new AuthError("AUTH_FAILED", "Failed to get user after setting session");
      }

      // DB にユーザーが存在しない場合は作成
      const existing = await this.userRepository.findByAuthId(authUser.id);
      if (!existing && authUser.email) {
        // 招待リンク経由（メールのリンク経由）のセッションなら招待のロールと担当議員を付ける。
        // このアクションには任意のトークンを渡せるため、パスワードや Google のセッションでは使わない
        // （Google ログインの許可ドメインの判定はここでは行わないので、Google は確かめられていない扱い）
        if (UserInvitationModel.canAcceptOnFirstLogin(session.signInProvider, false)) {
          await this.invitationRepository.createUserAcceptingInvitation({
            authId: authUser.id,
            email: authUser.email,
          });
        } else {
          await this.userRepository.create({
            authId: authUser.id,
            email: authUser.email,
            roles: [],
          });
        }
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
