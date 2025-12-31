import { GetCurrentUserUsecase } from "@/server/contexts/auth/application/usecases/get-current-user-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository, User } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import type { SupabaseAuthUser } from "@/server/contexts/auth/domain/models/supabase-auth-user";

describe("GetCurrentUserUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: GetCurrentUserUsecase;

  const createMockSupabaseUser = (overrides: Partial<SupabaseAuthUser> = {}): SupabaseAuthUser => ({
    id: "auth-user-id",
    email: "test@example.com",
    emailConfirmedAt: "2024-01-01T00:00:00Z",
    lastSignInAt: "2024-01-01T00:00:00Z",
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
    usecase = new GetCurrentUserUsecase(mockAuthProvider, mockUserRepository);
  });

  describe("execute", () => {
    it("認証済みユーザーがDBに存在する場合はそのユーザーを返す", async () => {
      const authUser = createMockSupabaseUser();
      const dbUser = createMockUser();
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(dbUser);

      const result = await usecase.execute();

      expect(result).toEqual(dbUser);
      expect(mockAuthProvider.getUser).toHaveBeenCalled();
      expect(mockUserRepository.findByAuthId).toHaveBeenCalledWith("auth-user-id");
    });

    it("認証されていない場合はnullを返す", async () => {
      mockAuthProvider.getUser.mockResolvedValue(null);

      const result = await usecase.execute();

      expect(result).toBeNull();
      expect(mockUserRepository.findByAuthId).not.toHaveBeenCalled();
    });

    it("認証済みだがDBにユーザーがいない場合は新規作成する", async () => {
      const authUser = createMockSupabaseUser();
      const newUser = createMockUser();
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(newUser);

      const result = await usecase.execute();

      expect(result).toEqual(newUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        authId: "auth-user-id",
        email: "test@example.com",
        role: "user",
      });
    });

    it("認証済みだがメールがない場合はユーザーを作成しない", async () => {
      const authUser = createMockSupabaseUser({ email: null });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      const result = await usecase.execute();

      expect(result).toBeNull();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("AuthProviderがAuthErrorを投げた場合はそのまま再スローする", async () => {
      const authError = new AuthError("NETWORK_ERROR", "Network error");
      mockAuthProvider.getUser.mockRejectedValue(authError);

      await expect(usecase.execute()).rejects.toThrow(authError);
    });

    it("その他のエラーはAuthErrorにラップされる", async () => {
      mockAuthProvider.getUser.mockRejectedValue(new Error("Unknown error"));

      await expect(usecase.execute()).rejects.toThrow(AuthError);
      await expect(usecase.execute()).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });
  });
});
