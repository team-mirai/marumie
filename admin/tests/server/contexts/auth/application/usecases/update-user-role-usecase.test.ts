import { UpdateUserRoleUsecase } from "@/server/contexts/auth/application/usecases/update-user-role-usecase";
import { AuthError } from "@/server/contexts/auth/domain/errors/auth-error";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import {
  createMockSupabaseUser,
  createMockUser,
  createMockAuthProvider,
  createMockUserRepository,
} from "../../test-helpers";

describe("UpdateUserRoleUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: UpdateUserRoleUsecase;

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockUserRepository = createMockUserRepository();
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

      await expect(usecase.execute("target-user-id", "admin")).rejects.toMatchObject({
        name: "AuthError",
        code: "AUTH_FAILED",
      });
      expect(mockUserRepository.updateRole).not.toHaveBeenCalled();
    });

    it("user権限の場合はエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      const normalUser = createMockUser({ role: "user" });
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(normalUser);

      await expect(usecase.execute("target-user-id", "admin")).rejects.toMatchObject({
        name: "AuthError",
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

      await expect(usecase.execute("non-existent-id", "admin")).rejects.toMatchObject({
        name: "AuthError",
        code: "USER_NOT_FOUND",
      });
    });

    it("DBにユーザーが存在しない場合はuser権限として扱われエラーを投げる", async () => {
      const authUser = createMockSupabaseUser();
      mockAuthProvider.getUser.mockResolvedValue(authUser);
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.execute("target-user-id", "admin")).rejects.toMatchObject({
        name: "AuthError",
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

      await expect(usecase.execute("target-user-id", "admin")).rejects.toMatchObject({
        name: "AuthError",
        code: "AUTH_FAILED",
      });
    });
  });
});
