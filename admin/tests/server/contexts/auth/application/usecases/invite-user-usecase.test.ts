import { InviteUserUsecase } from "@/server/contexts/auth/application/usecases/invite-user-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { AdminAuthProvider } from "@/server/contexts/auth/domain/providers/admin-auth-provider.interface";
import type { UserRepository, User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

describe("InviteUserUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAdminAuthProvider: jest.Mocked<AdminAuthProvider>;
  let usecase: InviteUserUsecase;

  const originalEnv = process.env;

  const createMockSupabaseUser = (overrides: Partial<SupabaseAuthUser> = {}): SupabaseAuthUser => ({
    id: "auth-user-id",
    email: "admin@example.com",
    emailConfirmedAt: "2024-01-01T00:00:00Z",
    lastSignInAt: "2024-01-01T00:00:00Z",
    ...overrides,
  });

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: "user-id",
    authId: "auth-user-id",
    email: "admin@example.com",
    role: "admin",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };

    mockAuthProvider = {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      resetPasswordForEmail: jest.fn(),
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
    mockAdminAuthProvider = {
      inviteUserByEmail: jest.fn(),
    };
    usecase = new InviteUserUsecase(mockAuthProvider, mockUserRepository, mockAdminAuthProvider);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("execute", () => {
    it("admin権限を持つユーザーはユーザーを招待できる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockAdminAuthProvider.inviteUserByEmail.mockResolvedValue(undefined);

      await expect(usecase.execute("newuser@example.com")).resolves.toBeUndefined();
      expect(mockAdminAuthProvider.inviteUserByEmail).toHaveBeenCalledWith(
        "newuser@example.com",
        "http://localhost:3001/auth/callback"
      );
    });

    it("SITE_URLが設定されている場合はそれを使用する", async () => {
      process.env.SITE_URL = "https://example.com";
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockAdminAuthProvider.inviteUserByEmail.mockResolvedValue(undefined);

      await usecase.execute("newuser@example.com");

      expect(mockAdminAuthProvider.inviteUserByEmail).toHaveBeenCalledWith(
        "newuser@example.com",
        "https://example.com/auth/callback"
      );
    });

    it("未認証の場合はエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(null);

      await expect(usecase.execute("newuser@example.com")).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com")).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
      expect(mockAdminAuthProvider.inviteUserByEmail).not.toHaveBeenCalled();
    });

    it("DBにユーザーが存在しない場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.execute("newuser@example.com")).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("user権限の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const normalUser = createMockUser({ role: "user" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(normalUser);

      await expect(usecase.execute("newuser@example.com")).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com")).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
    });

    it("メールアドレスが空の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);

      await expect(usecase.execute("")).rejects.toThrow(AuthError);
      await expect(usecase.execute("")).rejects.toMatchObject({
        code: "INVALID_EMAIL",
      });
    });

    it("無効なメールアドレス形式の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);

      await expect(usecase.execute("invalid-email")).rejects.toThrow(AuthError);
      await expect(usecase.execute("invalid-email")).rejects.toMatchObject({
        code: "INVALID_EMAIL",
      });
    });

    it("AdminAuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      const authError = new AuthError("INVITE_FAILED", "Invite failed");
      mockAdminAuthProvider.inviteUserByEmail.mockRejectedValue(authError);

      await expect(usecase.execute("newuser@example.com")).rejects.toThrow(authError);
    });

    it("その他のエラーはAuthErrorにラップされる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockAdminAuthProvider.inviteUserByEmail.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute("newuser@example.com")).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com")).rejects.toMatchObject({
        code: "INVITE_FAILED",
      });
    });
  });
});
