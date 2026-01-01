import { CompleteInviteSessionUsecase } from "@/server/contexts/auth/application/usecases/complete-invite-session-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import {
  createMockSupabaseUser,
  createMockSession,
  createMockUser,
  createMockAuthProvider,
  createMockUserRepository,
} from "../../test-helpers";

describe("CompleteInviteSessionUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: CompleteInviteSessionUsecase;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockUserRepository = createMockUserRepository();
    usecase = new CompleteInviteSessionUsecase(mockAuthProvider, mockUserRepository);
  });

  describe("execute", () => {
    it("正常にセッションを設定し、新規ユーザーを作成する", async () => {
      const session = createMockSession();
      const authUser = createMockSupabaseUser();
      const newUser = createMockUser();

      mockAuthProvider.setSession.mockResolvedValue(session);
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      await expect(usecase.execute("access-token", "refresh-token")).resolves.toBeUndefined();

      expect(mockAuthProvider.setSession).toHaveBeenCalledWith("access-token", "refresh-token");
      expect(mockAuthProvider.getUser).toHaveBeenCalled();
      expect(mockUserRepository.findByAuthId).toHaveBeenCalledWith("auth-user-id");
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        authId: "auth-user-id",
        email: "test@example.com",
        role: "user",
      });
    });

    it("既存ユーザーの場合は新規作成しない", async () => {
      const session = createMockSession();
      const authUser = createMockSupabaseUser();
      const existingUser = createMockUser();

      mockAuthProvider.setSession.mockResolvedValue(session);
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(existingUser);

      await expect(usecase.execute("access-token", "refresh-token")).resolves.toBeUndefined();

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("メールがない場合はユーザーを作成しない", async () => {
      const session = createMockSession();
      const authUser = createMockSupabaseUser({ email: null });

      mockAuthProvider.setSession.mockResolvedValue(session);
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.execute("access-token", "refresh-token")).resolves.toBeUndefined();

      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("accessTokenが空の場合はエラーを投げる", async () => {
      await expect(usecase.execute("", "refresh-token")).rejects.toMatchObject({
        name: "AuthError",
        code: "INVALID_TOKEN",
      });
      expect(mockAuthProvider.setSession).not.toHaveBeenCalled();
    });

    it("refreshTokenが空の場合はエラーを投げる", async () => {
      await expect(usecase.execute("access-token", "")).rejects.toMatchObject({
        name: "AuthError",
        code: "INVALID_TOKEN",
      });
      expect(mockAuthProvider.setSession).not.toHaveBeenCalled();
    });

    it("セッション設定後にユーザーが取得できない場合はエラーを投げる", async () => {
      const session = createMockSession();
      mockAuthProvider.setSession.mockResolvedValue(session);
      mockAuthProvider.getUser.mockResolvedValue(null);

      await expect(usecase.execute("access-token", "refresh-token")).rejects.toMatchObject({
        name: "AuthError",
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

      await expect(usecase.execute("access-token", "refresh-token")).rejects.toMatchObject({
        name: "AuthError",
        code: "INVALID_TOKEN",
      });
    });
  });
});
