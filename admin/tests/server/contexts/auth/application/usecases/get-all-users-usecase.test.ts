import { GetAllUsersUsecase } from "@/server/contexts/auth/application/usecases/get-all-users-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository, User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

describe("GetAllUsersUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: GetAllUsersUsecase;

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
    usecase = new GetAllUsersUsecase(mockAuthProvider, mockUserRepository);
  });

  describe("checkPermission", () => {
    it("admin権限を持つユーザーは認可される", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);

      await expect(usecase.checkPermission()).resolves.toBeUndefined();
    });

    it("未認証の場合はエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(null);

      await expect(usecase.checkPermission()).rejects.toThrow(AuthError);
      await expect(usecase.checkPermission()).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });

    it("user権限の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const normalUser = createMockUser({ role: "user" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(normalUser);

      await expect(usecase.checkPermission()).rejects.toThrow(AuthError);
      await expect(usecase.checkPermission()).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
    });

    it("DBにユーザーが存在しない場合はuser権限として扱われエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.checkPermission()).rejects.toThrow(AuthError);
      await expect(usecase.checkPermission()).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
    });
  });

  describe("execute", () => {
    it("admin権限を持つユーザーは全ユーザー一覧を取得できる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      const allUsers = [
        adminUser,
        createMockUser({ id: "user-2", authId: "auth-2", email: "user@example.com", role: "user" }),
      ];
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockUserRepository.findAll.mockResolvedValue(allUsers);

      const result = await usecase.execute();

      expect(result).toEqual(allUsers);
      expect(mockUserRepository.findAll).toHaveBeenCalled();
    });

    it("未認証の場合はエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(null);

      await expect(usecase.execute()).rejects.toThrow(AuthError);
      await expect(usecase.execute()).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
      expect(mockUserRepository.findAll).not.toHaveBeenCalled();
    });

    it("user権限の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const normalUser = createMockUser({ role: "user" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(normalUser);

      await expect(usecase.execute()).rejects.toThrow(AuthError);
      await expect(usecase.execute()).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
      expect(mockUserRepository.findAll).not.toHaveBeenCalled();
    });
  });
});
