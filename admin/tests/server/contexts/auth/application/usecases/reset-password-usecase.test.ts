import { ResetPasswordUsecase } from "@/server/contexts/auth/application/usecases/reset-password-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { createMockAuthProvider, createMockSupabaseUser } from "../../test-helpers";

describe("ResetPasswordUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let usecase: ResetPasswordUsecase;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    usecase = new ResetPasswordUsecase(mockAuthProvider);
  });

  describe("execute", () => {
    it("正常にパスワードをリセットできる", async () => {
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

    it("空白文字のみのパスワードはエラーを投げる", async () => {
      await expect(usecase.execute("      ")).rejects.toThrow(AuthError);
      await expect(usecase.execute("      ")).rejects.toMatchObject({
        code: "WEAK_PASSWORD",
      });
      expect(mockAuthProvider.updateUser).not.toHaveBeenCalled();
    });

    it("AuthProviderがAUTH_FAILEDを投げた場合はSESSION_EXPIREDに変換される", async () => {
      const authError = new AuthError("AUTH_FAILED", "Update failed");
      mockAuthProvider.updateUser.mockRejectedValue(authError);

      await expect(usecase.execute("password123")).rejects.toThrow(AuthError);
      await expect(usecase.execute("password123")).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });
    });

    it("AuthProviderがWEAK_PASSWORDを投げた場合はそのまま再スローする", async () => {
      const authError = new AuthError("WEAK_PASSWORD", "Password too weak");
      mockAuthProvider.updateUser.mockRejectedValue(authError);

      await expect(usecase.execute("password123")).rejects.toThrow(authError);
    });

    it("その他のエラーはSESSION_EXPIREDにラップされる", async () => {
      mockAuthProvider.updateUser.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute("password123")).rejects.toThrow(AuthError);
      await expect(usecase.execute("password123")).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });
    });
  });
});
