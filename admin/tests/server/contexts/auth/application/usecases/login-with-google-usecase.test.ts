import { LoginWithGoogleUsecase } from "@/server/contexts/auth/application/usecases/login-with-google-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { AllowedEmailDomains } from "@/server/contexts/auth/domain/models/allowed-email-domains";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { createMockAuthProvider } from "../../test-helpers";

describe("LoginWithGoogleUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let usecase: LoginWithGoogleUsecase;

  const redirectTo = "https://admin.example.com/api/auth/callback";

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    usecase = new LoginWithGoogleUsecase(mockAuthProvider);
  });

  it("認可URLを返す", async () => {
    mockAuthProvider.signInWithOAuth.mockResolvedValue({ url: "https://auth.example.com/oauth" });

    const result = await usecase.execute(redirectTo, AllowedEmailDomains.parse(undefined));

    expect(result).toEqual({ url: "https://auth.example.com/oauth" });
    expect(mockAuthProvider.signInWithOAuth).toHaveBeenCalledWith("google", {
      redirectTo,
      queryParams: undefined,
    });
  });

  it("許可ドメインが1件の場合はhdパラメータを付与する", async () => {
    mockAuthProvider.signInWithOAuth.mockResolvedValue({ url: "https://auth.example.com/oauth" });

    await usecase.execute(redirectTo, AllowedEmailDomains.parse("team-mir.ai"));

    expect(mockAuthProvider.signInWithOAuth).toHaveBeenCalledWith("google", {
      redirectTo,
      queryParams: { hd: "team-mir.ai" },
    });
  });

  it("許可ドメインが複数の場合はhdパラメータを付与しない", async () => {
    mockAuthProvider.signInWithOAuth.mockResolvedValue({ url: "https://auth.example.com/oauth" });

    await usecase.execute(redirectTo, AllowedEmailDomains.parse("team-mir.ai,example.com"));

    expect(mockAuthProvider.signInWithOAuth).toHaveBeenCalledWith("google", {
      redirectTo,
      queryParams: undefined,
    });
  });

  it("AuthErrorはそのまま再スローする", async () => {
    const authError = new AuthError("NETWORK_ERROR", "connection failed");
    mockAuthProvider.signInWithOAuth.mockRejectedValue(authError);

    await expect(usecase.execute(redirectTo, AllowedEmailDomains.parse(undefined))).rejects.toThrow(
      authError,
    );
  });

  it("その他のエラーはAuthErrorにラップされる", async () => {
    mockAuthProvider.signInWithOAuth.mockRejectedValue(new Error("Unknown error"));

    await expect(
      usecase.execute(redirectTo, AllowedEmailDomains.parse(undefined)),
    ).rejects.toMatchObject({
      name: "AuthError",
      code: "AUTH_FAILED",
    });
  });
});
