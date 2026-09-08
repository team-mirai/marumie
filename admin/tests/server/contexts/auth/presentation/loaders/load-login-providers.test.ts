import { loadLoginProviders } from "@/server/contexts/auth/presentation/loaders/load-login-providers";

describe("loadLoginProviders", () => {
  const originalValue = process.env.ADMIN_AUTH_PROVIDERS;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.ADMIN_AUTH_PROVIDERS;
    } else {
      process.env.ADMIN_AUTH_PROVIDERS = originalValue;
    }
  });

  it("未設定の場合はパスワードログインのみ表示する", async () => {
    delete process.env.ADMIN_AUTH_PROVIDERS;

    await expect(loadLoginProviders()).resolves.toEqual({
      showPasswordLogin: true,
      showGoogleLogin: false,
    });
  });

  it("password,google が設定されている場合は両方表示する", async () => {
    process.env.ADMIN_AUTH_PROVIDERS = "password,google";

    await expect(loadLoginProviders()).resolves.toEqual({
      showPasswordLogin: true,
      showGoogleLogin: true,
    });
  });

  it("google のみが設定されている場合はGoogleログインのみ表示する", async () => {
    process.env.ADMIN_AUTH_PROVIDERS = "google";

    await expect(loadLoginProviders()).resolves.toEqual({
      showPasswordLogin: false,
      showGoogleLogin: true,
    });
  });
});
