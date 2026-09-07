import { ExchangeCodeForSessionUsecase } from "@/server/contexts/auth/application/usecases/exchange-code-for-session-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import { AllowedEmailDomains } from "@/server/contexts/auth/domain/models/allowed-email-domains";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import {
  createMockSupabaseUser,
  createMockSession,
  createMockUser,
  createMockAuthProvider,
  createMockUserRepository,
} from "../../test-helpers";

const noRestriction = AllowedEmailDomains.parse(undefined);

describe("ExchangeCodeForSessionUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: ExchangeCodeForSessionUsecase;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockUserRepository = createMockUserRepository();
    usecase = new ExchangeCodeForSessionUsecase(mockAuthProvider, mockUserRepository, noRestriction);
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
        requiresPasswordSetup: false,
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
        requiresPasswordSetup: true,
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        authId: "auth-user-id",
        email: "test@example.com",
        role: "user",
      });
    });

    it("新規ユーザーでlastSignInAtがある場合はrequiresPasswordSetupがfalse", async () => {
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

      expect(result.requiresPasswordSetup).toBe(false);
    });

    it("新規ユーザーでemailConfirmedAtがない場合はrequiresPasswordSetupがfalse", async () => {
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

      expect(result.requiresPasswordSetup).toBe(false);
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

  describe("execute（ドメイン制限あり）", () => {
    const restricted = AllowedEmailDomains.parse("team-mir.ai");

    beforeEach(() => {
      usecase = new ExchangeCodeForSessionUsecase(mockAuthProvider, mockUserRepository, restricted);
    });

    it("Google経由で許可ドメインのユーザーはログインでき、パスワード設定は不要", async () => {
      const session = createMockSession({
        user: createMockSupabaseUser({
          email: "member@team-mir.ai",
          provider: "google",
          emailConfirmedAt: "2024-01-01T00:00:00Z",
          lastSignInAt: null,
        }),
      });
      const newUser = createMockUser({ email: "member@team-mir.ai" });

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);
      mockUserRepository.findByAuthId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await usecase.execute("auth-code");

      expect(result).toEqual({
        user: newUser,
        requiresPasswordSetup: false,
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        authId: "auth-user-id",
        email: "member@team-mir.ai",
        role: "user",
      });
    });

    it("Google経由で許可ドメイン外の場合はセッションを破棄してエラーを投げる", async () => {
      const session = createMockSession({
        user: createMockSupabaseUser({
          email: "outsider@example.com",
          provider: "google",
        }),
      });

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);

      await expect(usecase.execute("auth-code")).rejects.toMatchObject({
        name: "AuthError",
        code: "DOMAIN_NOT_ALLOWED",
      });
      expect(mockAuthProvider.signOut).toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("Google経由でメールがない場合もエラーを投げる", async () => {
      const session = createMockSession({
        user: createMockSupabaseUser({ email: null, provider: "google" }),
      });

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);

      await expect(usecase.execute("auth-code")).rejects.toMatchObject({
        name: "AuthError",
        code: "DOMAIN_NOT_ALLOWED",
      });
      expect(mockAuthProvider.signOut).toHaveBeenCalled();
    });

    it("メール（招待）経由のユーザーにはドメイン制限を適用しない", async () => {
      const session = createMockSession({
        user: createMockSupabaseUser({
          email: "invited@example.com",
          provider: "email",
          emailConfirmedAt: "2024-01-01T00:00:00Z",
          lastSignInAt: null,
        }),
      });
      const newUser = createMockUser({ email: "invited@example.com" });

      mockAuthProvider.exchangeCodeForSession.mockResolvedValue(session);
      mockUserRepository.findByAuthId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await usecase.execute("auth-code");

      expect(result.requiresPasswordSetup).toBe(true);
      expect(mockAuthProvider.signOut).not.toHaveBeenCalled();
    });
  });
});
