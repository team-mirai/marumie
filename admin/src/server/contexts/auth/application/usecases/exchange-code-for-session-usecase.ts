import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AllowedEmailDomains } from "@/server/contexts/auth/domain/models/allowed-email-domains";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

interface ExchangeCodeResult {
  user: User;
  /** 招待（メール）経由の新規ユーザーのみ true。パスワード設定画面へ誘導する */
  requiresPasswordSetup: boolean;
}

/**
 * OAuth コールバック処理のユースケース
 * code を session に交換し、必要に応じてユーザーを作成する
 */
export class ExchangeCodeForSessionUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
    private readonly allowedEmailDomains: AllowedEmailDomains,
  ) {}

  async execute(code: string): Promise<ExchangeCodeResult> {
    try {
      const session = await this.authProvider.exchangeCodeForSession(code);

      // Google 経由のログインのみドメイン制限を適用する
      // （招待・リカバリー等のメール経由フローは従来どおり制限しない）
      const isGoogleLogin = session.user.provider === "google";
      if (
        isGoogleLogin &&
        !AllowedEmailDomains.isAllowed(this.allowedEmailDomains, session.user.email)
      ) {
        // 認証済み状態を残さないようセッションを破棄する
        await this.authProvider.signOut();
        throw new AuthError(
          "DOMAIN_NOT_ALLOWED",
          `Email domain is not allowed: ${session.user.email}`,
        );
      }

      // DB にユーザーが存在するか確認
      let dbUser = await this.userRepository.findByAuthId(session.user.id);
      let requiresPasswordSetup = false;

      if (!dbUser) {
        // 初回ログインのユーザーを DB に作成
        const email = session.user.email;
        if (!email) {
          throw new AuthError("AUTH_FAILED", "User email is required");
        }

        dbUser = await this.userRepository.create({
          authId: session.user.id,
          email: email,
          role: "user",
        });

        // 招待経由（emailConfirmedAt があり lastSignInAt がない）の新規ユーザーは
        // パスワード設定が必要。Google 経由のユーザーはパスワード不要のためスキップ
        requiresPasswordSetup =
          !isGoogleLogin && !!session.user.emailConfirmedAt && !session.user.lastSignInAt;
      }

      return { user: dbUser, requiresPasswordSetup };
    } catch (e) {
      console.error("Exchange code for session failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("INVALID_TOKEN", `Failed to exchange code: ${String(e)}`, e);
    }
  }
}
