import "server-only";

import { AuthProviderConfig } from "@/server/contexts/auth/domain/models/auth-provider-config";

/**
 * ログイン画面に表示する認証手段
 */
interface LoginProviders {
  showPasswordLogin: boolean;
  showGoogleLogin: boolean;
}

/**
 * ログイン画面に表示する認証手段を取得するローダー
 *
 * 表示制御はあくまで UI の出し分けであり、無効化した認証方式の拒否は
 * 各サーバーアクション / ユースケース側でも行う
 */
export async function loadLoginProviders(): Promise<LoginProviders> {
  const config = AuthProviderConfig.parse(process.env.ADMIN_AUTH_PROVIDERS);

  return {
    showPasswordLogin: AuthProviderConfig.isEnabled(config, "password"),
    showGoogleLogin: AuthProviderConfig.isEnabled(config, "google"),
  };
}
