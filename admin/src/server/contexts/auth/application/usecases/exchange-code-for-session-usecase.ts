import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AllowedEmailDomains } from "@/server/contexts/auth/domain/models/allowed-email-domains";
import { AuthProviderConfig } from "@/server/contexts/auth/domain/models/auth-provider-config";
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
    private readonly providerConfig: AuthProviderConfig,
  ) {}

  async execute(code: string): Promise<ExchangeCodeResult> {
    try {
      const session = await this.authProvider.exchangeCodeForSession(code);

      // app_metadata の登録元プロバイダーではなく、このサインインで実際に使われた
      // プロバイダーで判定する（メールと Google の両方の identity を持つユーザー対策）
      const isGoogleLogin = session.signInProvider === "google";

      if (isGoogleLogin) {
        // 無効化されたプロバイダーでのログインは、認可コードが正当でも拒否する
        if (!AuthProviderConfig.isEnabled(this.providerConfig, "google")) {
          await this.destroySession();
          throw new AuthError("PROVIDER_DISABLED", "Google login is disabled");
        }

        // Google 経由のログインのみドメイン制限を適用する
        // （招待・リカバリー等のメール経由フローは従来どおり制限しない）
        if (!AllowedEmailDomains.isAllowed(this.allowedEmailDomains, session.user.email)) {
          await this.destroySession();
          throw new AuthError(
            "DOMAIN_NOT_ALLOWED",
            `Email domain is not allowed: ${session.user.email}`,
          );
        }
      }

      // DB にユーザーが存在するか確認
      let dbUser = await this.userRepository.findByAuthId(session.user.id);
      let requiresPasswordSetup = false;

      if (!dbUser) {
        // 初回ログインのユーザーを DB に作成
        const email = session.user.email;
        if (!email) {
          await this.destroySession();
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

  /**
   * ログインを拒否する際に、認証済みセッションを残さないよう破棄する
   * 破棄に失敗しても拒否の理由をそのまま呼び出し元へ伝えるため、例外は握りつぶす
   */
  private async destroySession(): Promise<void> {
    try {
      await this.authProvider.signOut();
    } catch (e) {
      console.error("Failed to sign out after rejecting login:", e);
    }
  }
}
