import { RequestPasswordResetUsecase } from "@/server/contexts/auth/application/usecases/request-password-reset-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import { createMockAuthProvider } from "../../test-helpers";

describe("RequestPasswordResetUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let usecase: RequestPasswordResetUsecase;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    usecase = new RequestPasswordResetUsecase(mockAuthProvider);
  });

  describe("execute", () => {
    it("正常にパスワードリセットメールを送信できる", async () => {
      mockAuthProvider.resetPasswordForEmail.mockResolvedValue(undefined);

      await expect(usecase.execute("test@example.com")).resolves.toBeUndefined();
      expect(mockAuthProvider.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.stringContaining("/login")
      );
    });

    it("メールアドレスが空の場合はエラーを投げる", async () => {
      await expect(usecase.execute("")).rejects.toThrow(AuthError);
      await expect(usecase.execute("")).rejects.toMatchObject({
        code: "INVALID_EMAIL",
      });
      expect(mockAuthProvider.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("メールアドレスの形式が不正な場合はエラーを投げる", async () => {
      await expect(usecase.execute("invalid-email")).rejects.toThrow(AuthError);
      await expect(usecase.execute("invalid-email")).rejects.toMatchObject({
        code: "INVALID_EMAIL",
      });
      expect(mockAuthProvider.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("@がないメールアドレスはエラーを投げる", async () => {
      await expect(usecase.execute("testexample.com")).rejects.toThrow(AuthError);
      await expect(usecase.execute("testexample.com")).rejects.toMatchObject({
        code: "INVALID_EMAIL",
      });
      expect(mockAuthProvider.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("ドメインがないメールアドレスはエラーを投げる", async () => {
      await expect(usecase.execute("test@")).rejects.toThrow(AuthError);
      await expect(usecase.execute("test@")).rejects.toMatchObject({
        code: "INVALID_EMAIL",
      });
      expect(mockAuthProvider.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    it("AuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authError = new AuthError("RESET_EMAIL_FAILED", "Failed to send email");
      mockAuthProvider.resetPasswordForEmail.mockRejectedValue(authError);

      await expect(usecase.execute("test@example.com")).rejects.toThrow(authError);
    });

    it("その他のエラーはAuthErrorにラップされる", async () => {
      mockAuthProvider.resetPasswordForEmail.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute("test@example.com")).rejects.toThrow(AuthError);
      await expect(usecase.execute("test@example.com")).rejects.toMatchObject({
        code: "RESET_EMAIL_FAILED",
      });
    });
  });
});
