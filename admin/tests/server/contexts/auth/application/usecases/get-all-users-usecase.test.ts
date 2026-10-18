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
    roles: ["admin"],
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
    usecase = new GetAllUsersUsecase(mockAuthProvider, mockUserRepository);
  });

  describe("execute", () => {
    it("admin権限を持つユーザーは全ユーザー一覧を取得できる", async () => {
      const authUser = createMockSupabaseUser();
      const adminUser = createMockUser({ roles: ["admin"] });
      const allUsers = [
        adminUser,
        createMockUser({ id: "user-2", authId: "auth-2", email: "user@example.com", roles: ["political_fund", "research_fund"] }),
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

    it("admin 以外のロールしか持たない場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const normalUser = createMockUser({ roles: ["political_fund", "research_fund"] });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(normalUser);

      await expect(usecase.execute()).rejects.toThrow(AuthError);
      await expect(usecase.execute()).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
      expect(mockUserRepository.findAll).not.toHaveBeenCalled();
    });

    it("DBにユーザーが存在しない場合はロールなしとして扱われエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.execute()).rejects.toThrow(AuthError);
      await expect(usecase.execute()).rejects.toMatchObject({
        code: "INSUFFICIENT_PERMISSION",
      });
      expect(mockUserRepository.findAll).not.toHaveBeenCalled();
    });
  });
});
