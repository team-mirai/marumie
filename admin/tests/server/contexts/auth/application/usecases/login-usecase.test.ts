import { LoginUsecase } from "@/server/contexts/auth/application/usecases/login-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AuthSession } from "@/server/contexts/auth/domain/models/auth-session";

describe("LoginUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let usecase: LoginUsecase;

  const createMockSession = (): AuthSession => ({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: {
      id: "user-id",
      email: "test@example.com",
      emailConfirmedAt: "2024-01-01T00:00:00Z",
      lastSignInAt: "2024-01-01T00:00:00Z",
    },
  });

  beforeEach(() => {
    mockAuthProvider = {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    };
    usecase = new LoginUsecase(mockAuthProvider);
  });

  describe("execute", () => {
    it("正常にログインできる", async () => {
      const session = createMockSession();
      mockAuthProvider.signInWithPassword.mockResolvedValue(session);

      const result = await usecase.execute("test@example.com", "password123");

      expect(result).toEqual(session);
      expect(mockAuthProvider.signInWithPassword).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });

    it("メールアドレスが空の場合はエラーを投げる", async () => {
      await expect(usecase.execute("", "password123")).rejects.toThrow(AuthError);
      await expect(usecase.execute("", "password123")).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });

    it("パスワードが空の場合はエラーを投げる", async () => {
      await expect(usecase.execute("test@example.com", "")).rejects.toThrow(AuthError);
      await expect(usecase.execute("test@example.com", "")).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });

    it("AuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authError = new AuthError("AUTH_FAILED", "Invalid credentials");
      mockAuthProvider.signInWithPassword.mockRejectedValue(authError);

      await expect(usecase.execute("test@example.com", "password123")).rejects.toThrow(
        authError
      );
    });

    it("AuthProvider以外のエラーはAuthErrorにラップされる", async () => {
      mockAuthProvider.signInWithPassword.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute("test@example.com", "password123")).rejects.toThrow(
        AuthError
      );
      await expect(usecase.execute("test@example.com", "password123")).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });
  });
});
