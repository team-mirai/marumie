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
    roles: ["admin"],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, SITE_URL: "http://localhost:3001" };

    mockAuthProvider = {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      updateUser: jest.fn(),
      setSession: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      signInWithOAuth: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    };
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByAuthId: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      updateRoles: jest.fn(),
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
      const adminUser = createMockUser({ roles: ["admin"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockAdminAuthProvider.inviteUserByEmail.mockResolvedValue({ authId: "invited-auth-id" });

      await expect(usecase.execute("newuser@example.com", [])).resolves.toBeUndefined();
      expect(mockAdminAuthProvider.inviteUserByEmail).toHaveBeenCalledWith(
        "newuser@example.com",
        "http://localhost:3001/auth/callback"
      );
    });

    it("招待時に選んだロールを持つ DB ユーザーを初回ログイン前に作る", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId
        .mockResolvedValueOnce(createMockUser({ roles: ["admin"] }))
        .mockResolvedValueOnce(null);
      mockAdminAuthProvider.inviteUserByEmail.mockResolvedValue({ authId: "invited-auth-id" });

      await usecase.execute("newuser@example.com", ["research_fund", "political_fund"]);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        authId: "invited-auth-id",
        email: "newuser@example.com",
        roles: ["political_fund", "research_fund"],
      });
      expect(mockUserRepository.updateRoles).not.toHaveBeenCalled();
    });

    it("招待先の DB ユーザーが既にある場合は選んだロールに付け替える", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId
        .mockResolvedValueOnce(createMockUser({ roles: ["admin"] }))
        .mockResolvedValueOnce(createMockUser({ authId: "invited-auth-id", roles: [] }));
      mockAdminAuthProvider.inviteUserByEmail.mockResolvedValue({ authId: "invited-auth-id" });

      await usecase.execute("newuser@example.com", ["research_fund"]);

      expect(mockUserRepository.updateRoles).toHaveBeenCalledWith("invited-auth-id", [
        "research_fund",
      ]);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("未知のロールが含まれる場合は招待せずに INVALID_ROLE で拒否する", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId.mockResolvedValue(createMockUser({ roles: ["admin"] }));

      await expect(usecase.execute("newuser@example.com", ["user"])).rejects.toMatchObject({
        code: "INVALID_ROLE",
      });
      expect(mockAdminAuthProvider.inviteUserByEmail).not.toHaveBeenCalled();
    });

    it("SITE_URLが設定されている場合はそれを使用する", async () => {
      process.env.SITE_URL = "https://example.com";
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ roles: ["admin"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockAdminAuthProvider.inviteUserByEmail.mockResolvedValue({ authId: "invited-auth-id" });

      await usecase.execute("newuser@example.com", []);

      expect(mockAdminAuthProvider.inviteUserByEmail).toHaveBeenCalledWith(
        "newuser@example.com",
        "https://example.com/auth/callback"
      );
    });

    it("未認証の場合はエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(null);

      await expect(usecase.execute("newuser@example.com", [])).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com", [])).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
      expect(mockAdminAuthProvider.inviteUserByEmail).not.toHaveBeenCalled();
    });

    it("DBにユーザーが存在しない場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.execute("newuser@example.com", [])).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com", [])).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("admin 以外のロールしか持たない場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const normalUser = createMockUser({ roles: ["political_fund", "research_fund"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(normalUser);

      await expect(usecase.execute("newuser@example.com", [])).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com", [])).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
    });

    it("メールアドレスが空の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ roles: ["admin"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);

      await expect(usecase.execute("", [])).rejects.toThrow(AuthError);
      await expect(usecase.execute("", [])).rejects.toMatchObject({
        code: "INVALID_EMAIL",
      });
    });

    it("無効なメールアドレス形式の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ roles: ["admin"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);

      await expect(usecase.execute("invalid-email", [])).rejects.toThrow(AuthError);
      await expect(usecase.execute("invalid-email", [])).rejects.toMatchObject({
        code: "INVALID_EMAIL",
      });
    });

    it("AdminAuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ roles: ["admin"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      const authError = new AuthError("INVITE_FAILED", "Invite failed");
      mockAdminAuthProvider.inviteUserByEmail.mockRejectedValue(authError);

      await expect(usecase.execute("newuser@example.com", [])).rejects.toThrow(authError);
    });

    it("その他のエラーはAuthErrorにラップされる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ roles: ["admin"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockAdminAuthProvider.inviteUserByEmail.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute("newuser@example.com", [])).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com", [])).rejects.toMatchObject({
        code: "INVITE_FAILED",
      });
    });

    it("SITE_URLが未設定の場合はエラーを投げる", async () => {
      delete process.env.SITE_URL;
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ roles: ["admin"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);

      await expect(usecase.execute("newuser@example.com", [])).rejects.toThrow(AuthError);
      await expect(usecase.execute("newuser@example.com", [])).rejects.toMatchObject({
        code: "NETWORK_ERROR",
      });
    });
  });
});
