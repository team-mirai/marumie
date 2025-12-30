import { UpdateUserRoleUsecase } from "@/server/contexts/auth/application/usecases/update-user-role-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository, User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

describe("UpdateUserRoleUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: UpdateUserRoleUsecase;

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
    usecase = new UpdateUserRoleUsecase(mockAuthProvider, mockUserRepository);
  });

  describe("execute", () => {
    it("admin権限を持つユーザーは他のユーザーのロールを更新できる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      const targetUser = createMockUser({
        id: "target-user-id",
        authId: "target-auth-id",
        email: "target@example.com",
        role: "user",
      });
      const updatedUser = { ...targetUser, role: "admin" as const };

      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockUserRepository.findById.mockResolvedValue(targetUser);
      mockUserRepository.updateRole.mockResolvedValue(updatedUser);

      const result = await usecase.execute("target-user-id", "admin");

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith("target-user-id");
      expect(mockUserRepository.updateRole).toHaveBeenCalledWith("target-auth-id", "admin");
    });

    it("未認証の場合はエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(null);

      await expect(usecase.execute("target-user-id", "admin")).rejects.toThrow(AuthError);
      await expect(usecase.execute("target-user-id", "admin")).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
      expect(mockUserRepository.updateRole).not.toHaveBeenCalled();
    });

    it("user権限の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const normalUser = createMockUser({ role: "user" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(normalUser);

      await expect(usecase.execute("target-user-id", "admin")).rejects.toThrow(AuthError);
      await expect(usecase.execute("target-user-id", "admin")).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
      expect(mockUserRepository.updateRole).not.toHaveBeenCalled();
    });

    it("対象ユーザーが存在しない場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(usecase.execute("non-existent-id", "admin")).rejects.toThrow(AuthError);
      await expect(usecase.execute("non-existent-id", "admin")).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("DBにユーザーが存在しない場合はuser権限として扱われエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.execute("target-user-id", "admin")).rejects.toThrow(AuthError);
      await expect(usecase.execute("target-user-id", "admin")).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
    });

    it("updateRoleがエラーを投げた場合はAuthErrorにラップされる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ role: "admin" });
      const targetUser = createMockUser({
        id: "target-user-id",
        authId: "target-auth-id",
        role: "user",
      });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(adminUser);
      mockUserRepository.findById.mockResolvedValue(targetUser);
      mockUserRepository.updateRole.mockRejectedValue(new Error("Database error"));

      await expect(usecase.execute("target-user-id", "admin")).rejects.toThrow(AuthError);
      await expect(usecase.execute("target-user-id", "admin")).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });
  });
});
