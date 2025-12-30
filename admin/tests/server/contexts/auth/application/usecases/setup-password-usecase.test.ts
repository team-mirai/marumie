import { SetupPasswordUsecase } from "@/server/contexts/auth/application/usecases/setup-password-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

describe("SetupPasswordUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let usecase: SetupPasswordUsecase;

  const createMockSupabaseUser = (): SupabaseAuthUser => ({
    id: "user-id",
    email: "test@example.com",
    emailConfirmedAt: "2024-01-01T00:00:00Z",
    lastSignInAt: "2024-01-01T00:00:00Z",
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
    usecase = new SetupPasswordUsecase(mockAuthProvider);
  });

  describe("execute", () => {
    it("正常にパスワードを設定できる", async () => {
      mockAuthProvider.updateUser.mockResolvedValue(createMockSupabaseUser());

      await expect(usecase.execute("password123")).resolves.toBeUndefined();
      expect(mockAuthProvider.updateUser).toHaveBeenCalledWith({ password: "password123" });
    });

    it("パスワードが空の場合はエラーを投げる", async () => {
      await expect(usecase.execute("")).rejects.toThrow(AuthError);
      await expect(usecase.execute("")).rejects.toMatchObject({
        code: "WEAK_PASSWORD",
      });
      expect(mockAuthProvider.updateUser).not.toHaveBeenCalled();
    });

    it("パスワードが6文字未満の場合はエラーを投げる", async () => {
      await expect(usecase.execute("12345")).rejects.toThrow(AuthError);
      await expect(usecase.execute("12345")).rejects.toMatchObject({
        code: "WEAK_PASSWORD",
      });
      expect(mockAuthProvider.updateUser).not.toHaveBeenCalled();
    });

    it("パスワードが6文字ちょうどの場合は成功する", async () => {
      mockAuthProvider.updateUser.mockResolvedValue(createMockSupabaseUser());

      await expect(usecase.execute("123456")).resolves.toBeUndefined();
      expect(mockAuthProvider.updateUser).toHaveBeenCalledWith({ password: "123456" });
    });

    it("AuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authError = new AuthError("AUTH_FAILED", "Update failed");
      mockAuthProvider.updateUser.mockRejectedValue(authError);

      await expect(usecase.execute("password123")).rejects.toThrow(authError);
    });

    it("その他のエラーはAuthErrorにラップされる", async () => {
      mockAuthProvider.updateUser.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute("password123")).rejects.toThrow(AuthError);
      await expect(usecase.execute("password123")).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });
  });
});
