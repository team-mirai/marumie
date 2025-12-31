import { LogoutUsecase } from "@/server/contexts/auth/application/usecases/logout-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";

describe("LogoutUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let usecase: LogoutUsecase;

  beforeEach(() => {
    mockAuthProvider = {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    };
    usecase = new LogoutUsecase(mockAuthProvider);
  });

  describe("execute", () => {
    it("正常にログアウトできる", async () => {
      mockAuthProvider.signOut.mockResolvedValue(undefined);

      await expect(usecase.execute()).resolves.toBeUndefined();
      expect(mockAuthProvider.signOut).toHaveBeenCalled();
    });

    it("AuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authError = new AuthError("NETWORK_ERROR", "Network error");
      mockAuthProvider.signOut.mockRejectedValue(authError);

      await expect(usecase.execute()).rejects.toThrow(authError);
    });

    it("AuthProvider以外のエラーはAuthErrorにラップされる", async () => {
      mockAuthProvider.signOut.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute()).rejects.toThrow(AuthError);
      await expect(usecase.execute()).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });
  });
});
