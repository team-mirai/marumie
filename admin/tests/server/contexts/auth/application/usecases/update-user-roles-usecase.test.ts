import { UpdateUserRolesUsecase } from "@/server/contexts/auth/application/usecases/update-user-roles-usecase";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type { UserRepository } from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import {
  createMockSupabaseUser,
  createMockUser,
  createMockAuthProvider,
  createMockUserRepository,
} from "../../test-helpers";

describe("UpdateUserRolesUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: UpdateUserRolesUsecase;

  const targetUser = createMockUser({
    id: "target-user-id",
    authId: "target-auth-id",
    email: "target@example.com",
    roles: ["political_fund"],
  });

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockUserRepository = createMockUserRepository();
    usecase = new UpdateUserRolesUsecase(mockAuthProvider, mockUserRepository);
  });

  describe("execute", () => {
    it("admin は他のユーザーのロールを複数まとめて付け替えられる（表示順に正規化して保存する）", async () => {
      const updatedUser = { ...targetUser, roles: ["political_fund" as const, "research_fund" as const] };
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId.mockResolvedValue(createMockUser({ roles: ["admin"] }));
      mockUserRepository.findById.mockResolvedValue(targetUser);
      mockUserRepository.updateRoles.mockResolvedValue(updatedUser);

      const result = await usecase.execute("target-user-id", ["research_fund", "political_fund"]);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith("target-user-id");
      expect(mockUserRepository.updateRoles).toHaveBeenCalledWith("target-auth-id", [
        "political_fund",
        "research_fund",
      ]);
    });

    it("ロールをすべて外せる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId.mockResolvedValue(createMockUser({ roles: ["admin"] }));
      mockUserRepository.findById.mockResolvedValue(targetUser);
      mockUserRepository.updateRoles.mockResolvedValue({ ...targetUser, roles: [] });

      await usecase.execute("target-user-id", []);

      expect(mockUserRepository.updateRoles).toHaveBeenCalledWith("target-auth-id", []);
    });

    it("未認証の場合はエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(null);

      await expect(usecase.execute("target-user-id", ["admin"])).rejects.toMatchObject({
        name: "AuthError",
        code: "AUTH_FAILED",
      });
      expect(mockUserRepository.updateRoles).not.toHaveBeenCalled();
    });

    it("admin 以外のロールしか持たない場合はエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId.mockResolvedValue(
        createMockUser({ roles: ["political_fund", "research_fund"] }),
      );

      await expect(usecase.execute("target-user-id", ["admin"])).rejects.toMatchObject({
        name: "AuthError",
        code: "INSUFFICIENT_PERMISSION",
      });
      expect(mockUserRepository.updateRoles).not.toHaveBeenCalled();
    });

    it("未知のロールが含まれる場合は INVALID_ROLE で拒否する", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId.mockResolvedValue(createMockUser({ roles: ["admin"] }));

      await expect(usecase.execute("target-user-id", ["user"])).rejects.toMatchObject({
        name: "AuthError",
        code: "INVALID_ROLE",
      });
      expect(mockUserRepository.updateRoles).not.toHaveBeenCalled();
    });

    it("対象ユーザーが存在しない場合はエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId.mockResolvedValue(createMockUser({ roles: ["admin"] }));
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(usecase.execute("non-existent-id", ["admin"])).rejects.toMatchObject({
        name: "AuthError",
        code: "USER_NOT_FOUND",
      });
    });

    it("DBにユーザーが存在しない場合はロールなしとして扱われエラーを投げる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId.mockResolvedValue(null);

      await expect(usecase.execute("target-user-id", ["admin"])).rejects.toMatchObject({
        name: "AuthError",
        code: "INSUFFICIENT_PERMISSION",
      });
    });

    it("updateRolesがエラーを投げた場合はAuthErrorにラップされる", async () => {
      mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
      mockUserRepository.findByAuthId.mockResolvedValue(createMockUser({ roles: ["admin"] }));
      mockUserRepository.findById.mockResolvedValue(targetUser);
      mockUserRepository.updateRoles.mockRejectedValue(new Error("Database error"));

      await expect(usecase.execute("target-user-id", ["admin"])).rejects.toMatchObject({
        name: "AuthError",
        code: "AUTH_FAILED",
      });
    });
  });
});
