import { ExchangeCodeForSessionUsecase } from "@/server/contexts/auth/application/usecases/exchange-code-for-session-usecase";
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

describe("ExchangeCodeForSessionUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: ExchangeCodeForSessionUsecase;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockUserRepository = createMockUserRepository();
    usecase = new ExchangeCodeForSessionUsecase(mockAuthProvider, mockUserRepository);
  });

  describe("execute", () => {
    it("既存ユーザーの場合はそのユーザーを返す", async () => {
      const session = createMockSession();
      const existingUser = createMockUser();

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);
      mockUserRepository.findByAuthId.mockResolvedValue(existingUser);

      const result = await usecase.execute("auth-code");

      expect(result).toEqual({
        user: existingUser,
        isNewUser: false,
      });
      expect(mockAuthProvider.exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
      expect(mockUserRepository.findByAuthId).toHaveBeenCalledWith("auth-user-id");
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("新規ユーザーの場合はユーザーを作成して返す", async () => {
      const session = createMockSession({
        user: createMockSupabaseUser({
          emailConfirmedAt: "2024-01-01T00:00:00Z",
          lastSignInAt: null,
        }),
      });
      const newUser = createMockUser();

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);
      mockUserRepository.findByAuthId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await usecase.execute("auth-code");

      expect(result).toEqual({
        user: newUser,
        isNewUser: true,
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        authId: "auth-user-id",
        email: "test@example.com",
        role: "user",
      });
    });

    it("新規ユーザーでlastSignInAtがある場合はisNewUserがfalse", async () => {
      const session = createMockSession({
        user: createMockSupabaseUser({
          emailConfirmedAt: "2024-01-01T00:00:00Z",
          lastSignInAt: "2024-01-01T00:00:00Z",
        }),
      });
      const newUser = createMockUser();

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);
      mockUserRepository.findByAuthId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await usecase.execute("auth-code");

      expect(result.isNewUser).toBe(false);
    });

    it("新規ユーザーでemailConfirmedAtがない場合はisNewUserがfalse", async () => {
      const session = createMockSession({
        user: createMockSupabaseUser({
          emailConfirmedAt: null,
          lastSignInAt: null,
        }),
      });
      const newUser = createMockUser();

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);
      mockUserRepository.findByAuthId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await usecase.execute("auth-code");

      expect(result.isNewUser).toBe(false);
    });

    it("新規ユーザーでメールがない場合はエラーを投げる", async () => {
      const session = createMockSession({
        user: createMockSupabaseUser({ email: null }),
      });

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.execute("auth-code")).rejects.toMatchObject({
        name: "AuthError",
        code: "AUTH_FAILED",
      });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("AuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authError = new AuthError("INVALID_TOKEN", "Invalid code");
      mockAuthProvider.exchangeCodeForSession.mockRejectedValue(authError);

      await expect(usecase.execute("auth-code")).rejects.toThrow(authError);
    });

    it("その他のエラーはAuthErrorにラップされる", async () => {
      mockAuthProvider.exchangeCodeForSession.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute("auth-code")).rejects.toMatchObject({
        name: "AuthError",
        code: "INVALID_TOKEN",
      });
    });
  });
});
