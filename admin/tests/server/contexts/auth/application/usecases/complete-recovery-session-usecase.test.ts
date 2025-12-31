import { CompleteRecoverySessionUsecase } from "@/server/contexts/auth/application/usecases/complete-recovery-session-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import {
  createMockSupabaseUser,
  createMockSession,
  createMockAuthProvider,
} from "../../test-helpers";

describe("CompleteRecoverySessionUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let usecase: CompleteRecoverySessionUsecase;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    usecase = new CompleteRecoverySessionUsecase(mockAuthProvider);
  });

  describe("execute", () => {
    it("正常にセッションを設定できる", async () => {
      const session = createMockSession();
      const authUser = createMockSupabaseUser();

      mockAuthProvider.setSession.mockResolvedValue(session);
      mockAuthProvider.getUser.mockResolvedValue(authUser);

      await expect(usecase.execute("access-token", "refresh-token")).resolves.toBeUndefined();

      expect(mockAuthProvider.setSession).toHaveBeenCalledWith("access-token", "refresh-token");
      expect(mockAuthProvider.getUser).toHaveBeenCalled();
    });

    it("accessTokenが空の場合はエラーを投げる", async () => {
      await expect(usecase.execute("", "refresh-token")).rejects.toThrow(AuthError);
      await expect(usecase.execute("", "refresh-token")).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
      expect(mockAuthProvider.setSession).not.toHaveBeenCalled();
    });

    it("refreshTokenが空の場合はエラーを投げる", async () => {
      await expect(usecase.execute("access-token", "")).rejects.toThrow(AuthError);
      await expect(usecase.execute("access-token", "")).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
      expect(mockAuthProvider.setSession).not.toHaveBeenCalled();
    });

    it("セッション設定後にユーザーが取得できない場合はエラーを投げる", async () => {
      const session = createMockSession();
      mockAuthProvider.setSession.mockResolvedValue(session);
      mockAuthProvider.getUser.mockResolvedValue(null);

      await expect(usecase.execute("access-token", "refresh-token")).rejects.toThrow(AuthError);
      await expect(usecase.execute("access-token", "refresh-token")).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });

    it("AuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authError = new AuthError("INVALID_TOKEN", "Invalid token");
      mockAuthProvider.setSession.mockRejectedValue(authError);

      await expect(usecase.execute("access-token", "refresh-token")).rejects.toThrow(authError);
    });

    it("その他のエラーはAuthErrorにラップされる", async () => {
      mockAuthProvider.setSession.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute("access-token", "refresh-token")).rejects.toThrow(AuthError);
      await expect(usecase.execute("access-token", "refresh-token")).rejects.toMatchObject({
        code: "INVALID_TOKEN",
      });
    });
  });
});
