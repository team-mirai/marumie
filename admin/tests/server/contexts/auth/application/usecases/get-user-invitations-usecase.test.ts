import { GetUserInvitationsUsecase } from "@/server/contexts/auth/application/usecases/get-user-invitations-usecase";
import type { UserInvitation } from "@/server/contexts/auth/domain/models/user-invitation";
import {
  createMockAuthProvider,
  createMockSupabaseUser,
  createMockUser,
  createMockUserInvitationRepository,
  createMockUserRepository,
} from "../../test-helpers";

describe("GetUserInvitationsUsecase", () => {
  const setup = (currentRoles: ("admin" | "research_fund")[] = ["admin"]) => {
    const authProvider = createMockAuthProvider();
    const userRepository = createMockUserRepository();
    const invitationRepository = createMockUserInvitationRepository();
    authProvider.getUser.mockResolvedValue(createMockSupabaseUser());
    userRepository.findByAuthId.mockResolvedValue(createMockUser({ roles: currentRoles }));
    const usecase = new GetUserInvitationsUsecase(
      authProvider,
      userRepository,
      invitationRepository,
    );
    return { usecase, invitationRepository };
  };

  it("未使用の招待の一覧を返す", async () => {
    const { usecase, invitationRepository } = setup();
    const invitations: UserInvitation[] = [
      {
        id: "invitation-id",
        email: "staff@team-mir.ai",
        roles: ["research_fund"],
        politicianIds: ["1"],
        createdAt: new Date("2026-11-01"),
      },
    ];
    invitationRepository.findAll.mockResolvedValue(invitations);

    await expect(usecase.execute()).resolves.toEqual(invitations);
  });

  it("admin 以外は見られない", async () => {
    const { usecase, invitationRepository } = setup(["research_fund"]);

    await expect(usecase.execute()).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSION" });
    expect(invitationRepository.findAll).not.toHaveBeenCalled();
  });
});
