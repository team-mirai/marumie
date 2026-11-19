const AUTH_PROVIDER_NAMES = ["password", "google"] as const;

export type AuthProviderName = (typeof AUTH_PROVIDER_NAMES)[number];

/**
 * ログイン画面で利用可能な認証プロバイダーの設定
 */
export interface AuthProviderConfig {
  providers: AuthProviderName[];
}

export const AuthProviderConfig = {
  /**
   * カンマ区切りの設定値（例: "password,google"）をパースする
   * 不明な値は無視し、有効な値が1つもない場合は password のみ（既存挙動）にフォールバックする
   */
  parse(value: string | undefined): AuthProviderConfig {
    const providers = (value ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name): name is AuthProviderName =>
        (AUTH_PROVIDER_NAMES as readonly string[]).includes(name),
      );
    if (providers.length === 0) {
      return { providers: ["password"] };
    }
    return { providers: [...new Set(providers)] };
  },

  isEnabled(config: AuthProviderConfig, provider: AuthProviderName): boolean {
    return config.providers.includes(provider);
  },
};
