import { CompleteInviteSessionUsecase } from "@/server/contexts/auth/application/usecases/complete-invite-session-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository, User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";
import type { AuthSession } from "@/server/contexts/auth/domain/models/auth-session";

describe("CompleteInviteSessionUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: CompleteInviteSessionUsecase;

  const createMockSupabaseUser = (overrides: Partial<SupabaseAuthUser> = {}): SupabaseAuthUser => ({
    id: "auth-user-id",
    email: "test@example.com",
    emailConfirmedAt: "2024-01-01T00:00:00Z",
    lastSignInAt: null,
    ...overrides,
  });

  const createMockSession = (overrides: Partial<AuthSession> = {}): AuthSession => ({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: createMockSupabaseUser(),
    ...overrides,
  });

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: "user-id",
    authId: "auth-user-id",
    email: "test@example.com",
    role: "user",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
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
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByAuthId: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      updateRole: jest.fn(),
      delete: jest.fn(),
    };
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
