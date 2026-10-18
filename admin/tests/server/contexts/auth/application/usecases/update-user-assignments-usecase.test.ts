import { UpdateUserAssignmentsUsecase } from "@/server/contexts/auth/application/usecases/update-user-assignments-usecase";
import type { AuthProvider } from "@/server/contexts/auth/domain/providers/auth-provider.interface";
import type {
  User,
  UserRepository,
} from "@/server/contexts/shared/domain/repositories/user-repository.interface";
import {
  createMockSupabaseUser,
  createMockUser,
  createMockAuthProvider,
  createMockUserRepository,
} from "../../test-helpers";

describe("UpdateUserAssignmentsUsecase", () => {
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let usecase: UpdateUserAssignmentsUsecase;

  const targetUser = createMockUser({
    id: "target-user-id",
    authId: "target-auth-id",
    email: "target@example.com",
    roles: ["research_fund"],
  });

  beforeEach(() => {
    mockAuthProvider = createMockAuthProvider();
    mockUserRepository = createMockUserRepository();
    usecase = new UpdateUserAssignmentsUsecase(mockAuthProvider, mockUserRepository);
  });

  const signInAs = (roles: User["roles"]) => {
    mockAuthProvider.getUser.mockResolvedValue(createMockSupabaseUser());
    mockUserRepository.findByAuthId.mockResolvedValue(createMockUser({ roles }));
  };

  it("admin は他のユーザーの担当議員を付け替えられる（重複を除き昇順に正規化して保存する）", async () => {
    signInAs(["admin"]);
    mockUserRepository.findById.mockResolvedValue(targetUser);
    mockUserRepository.replaceAssignedPoliticians.mockResolvedValue(["1", "3"]);

    await expect(usecase.execute("target-user-id", ["3", "1", "3"])).resolves.toEqual(["1", "3"]);
    expect(mockUserRepository.replaceAssignedPoliticians).toHaveBeenCalledWith("target-user-id", [
      "1",
      "3",
    ]);
  });

  it("担当をすべて外せる", async () => {
    signInAs(["admin"]);
    mockUserRepository.findById.mockResolvedValue(targetUser);
    mockUserRepository.replaceAssignedPoliticians.mockResolvedValue([]);

    await expect(usecase.execute("target-user-id", [])).resolves.toEqual([]);
    expect(mockUserRepository.replaceAssignedPoliticians).toHaveBeenCalledWith("target-user-id", []);
  });

  it("未認証の場合はエラーを投げる", async () => {
    mockAuthProvider.getUser.mockResolvedValue(null);

    await expect(usecase.execute("target-user-id", ["1"])).rejects.toMatchObject({
      name: "AuthError",
      code: "AUTH_FAILED",
    });
    expect(mockUserRepository.replaceAssignedPoliticians).not.toHaveBeenCalled();
  });

  it("admin 以外は担当を付け替えられない（research_fund のユーザーが自分に担当を付けることもできない）", async () => {
    signInAs(["research_fund"]);

    await expect(usecase.execute("user-id", ["1"])).rejects.toMatchObject({
      name: "AuthError",
      code: "INSUFFICIENT_PERMISSION",
    });
    expect(mockUserRepository.replaceAssignedPoliticians).not.toHaveBeenCalled();
  });

  it("議員の ID として不正な値が含まれる場合は INVALID_ASSIGNMENT で拒否する", async () => {
    signInAs(["admin"]);

    await expect(usecase.execute("target-user-id", ["1", "abc"])).rejects.toMatchObject({
      name: "AuthError",
      code: "INVALID_ASSIGNMENT",
    });
    expect(mockUserRepository.replaceAssignedPoliticians).not.toHaveBeenCalled();
  });

  it("対象ユーザーが存在しない場合はエラーを投げる", async () => {
    signInAs(["admin"]);
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(usecase.execute("non-existent-id", ["1"])).rejects.toMatchObject({
      name: "AuthError",
      code: "USER_NOT_FOUND",
    });
  });

  it("保存に失敗した場合（存在しない議員など）は AuthError にラップされる", async () => {
    signInAs(["admin"]);
    mockUserRepository.findById.mockResolvedValue(targetUser);
    mockUserRepository.replaceAssignedPoliticians.mockRejectedValue(new Error("FK violation"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(usecase.execute("target-user-id", ["999"])).rejects.toMatchObject({
      name: "AuthError",
      code: "AUTH_FAILED",
    });
  });
});
