import "server-only";

import type { AuthProvider } from "@/server/contexts/auth/domain/repositories/auth-provider.interface";
import type {
  UserRepository,
  User,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";

export interface ExchangeCodeResult {
  user: User;
  isNewUser: boolean;
}

/**
 * OAuth コールバック処理のユースケース
 * code を session に交換し、必要に応じてユーザーを作成する
 */
export class ExchangeCodeForSessionUsecase {
  constructor(
    private readonly authProvider: AuthProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(code: string): Promise<ExchangeCodeResult> {
    try {
      const session = await this.authProvider.exchangeCodeForSession(code);

      // DB にユーザーが存在するか確認
      let dbUser = await this.userRepository.findByAuthId(session.user.id);
      let isNewUser = false;

      if (!dbUser) {
        // 招待されたユーザーを DB に作成
        const email = session.user.email;
        if (!email) {
          throw new AuthError("AUTH_FAILED", "User email is required");
        }

        dbUser = await this.userRepository.create({
          authId: session.user.id,
          email: email,
          role: "user",
        });

        // emailConfirmedAt があり lastSignInAt がない場合は新規ユーザー
        isNewUser = !!session.user.emailConfirmedAt && !session.user.lastSignInAt;
      }

      return { user: dbUser, isNewUser };
    } catch (e) {
      console.error("Exchange code for session failed:", e);
      if (e instanceof AuthError) {
        throw e;
      }
      throw new AuthError("INVALID_TOKEN", `Failed to exchange code: ${String(e)}`, e);
    }
  }
}
