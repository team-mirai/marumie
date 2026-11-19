import { CancelUserInvitationUsecase } from "@/server/contexts/auth/application/usecases/cancel-user-invitation-usecase";
import {
  createMockAuthProvider,
  createMockSupabaseUser,
  createMockUser,
  createMockUserInvitationRepository,
  createMockUserRepository,
} from "../../test-helpers";

describe("CancelUserInvitationUsecase", () => {
  const setup = (currentRoles: ("admin" | "political_fund")[] = ["admin"]) => {
    const authProvider = createMockAuthProvider();
    const userRepository = createMockUserRepository();
    const invitationRepository = createMockUserInvitationRepository();
    authProvider.getUser.mockResolvedValue(createMockSupabaseUser());
    userRepository.findByAuthId.mockResolvedValue(createMockUser({ roles: currentRoles }));
    invitationRepository.delete.mockResolvedValue(true);
    const usecase = new CancelUserInvitationUsecase(
      authProvider,
      userRepository,
      invitationRepository,
    );
    return { usecase, invitationRepository };
  };

  it("招待を取り消す", async () => {
    const { usecase, invitationRepository } = setup();

    await expect(usecase.execute("invitation-id")).resolves.toBeUndefined();
    expect(invitationRepository.delete).toHaveBeenCalledWith("invitation-id");
  });

  it("既に使われた・取り消された招待なら INVITATION_NOT_FOUND", async () => {
    const { usecase, invitationRepository } = setup();
    invitationRepository.delete.mockResolvedValue(false);

    await expect(usecase.execute("invitation-id")).rejects.toMatchObject({
      code: "INVITATION_NOT_FOUND",
    });
  });

  it("admin 以外は取り消せない", async () => {
    const { usecase, invitationRepository } = setup(["political_fund"]);

    await expect(usecase.execute("invitation-id")).rejects.toMatchObject({
      code: "INSUFFICIENT_PERMISSION",
    });
    expect(invitationRepository.delete).not.toHaveBeenCalled();
  });
});
