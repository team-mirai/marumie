import { RegisterUserInvitationUsecase } from "@/server/contexts/auth/application/usecases/register-user-invitation-usecase";
import type { UserInvitation } from "@/server/contexts/auth/domain/models/user-invitation";
import {
  createMockAuthProvider,
  createMockSupabaseUser,
  createMockUser,
  createMockUserInvitationRepository,
  createMockUserRepository,
} from "../../test-helpers";

const invitation = (overrides: Partial<UserInvitation> = {}): UserInvitation => ({
  id: "invitation-id",
  email: "staff@team-mir.ai",
  roles: ["research_fund"],
  politicianIds: ["1"],
  createdAt: new Date("2026-11-01"),
  ...overrides,
});

describe("RegisterUserInvitationUsecase", () => {
  const setup = (currentRoles: ("admin" | "research_fund")[] = ["admin"]) => {
    const authProvider = createMockAuthProvider();
    const userRepository = createMockUserRepository();
    const invitationRepository = createMockUserInvitationRepository();
    authProvider.getUser.mockResolvedValue(createMockSupabaseUser({ id: "admin-auth-id" }));
    userRepository.findByAuthId.mockResolvedValue(
      createMockUser({ id: "admin-id", authId: "admin-auth-id", roles: currentRoles }),
    );
    userRepository.findByEmail.mockResolvedValue(null);
    invitationRepository.findByEmail.mockResolvedValue(null);
    invitationRepository.create.mockImplementation(async (data) =>
      invitation({ email: data.email, roles: data.roles, politicianIds: data.politicianIds }),
    );
    const usecase = new RegisterUserInvitationUsecase(
      authProvider,
      userRepository,
      invitationRepository,
    );
    return { usecase, authProvider, userRepository, invitationRepository };
  };

  it("メールアドレスを小文字にそろえ、ロールと担当議員を正規化して登録する", async () => {
    const { usecase, userRepository, invitationRepository } = setup();

    await usecase.execute(" Staff@Team-Mir.AI ", ["research_fund", "admin", "admin"], ["12", "3", "3"]);

    expect(userRepository.findByEmail).toHaveBeenCalledWith("staff@team-mir.ai");
    expect(invitationRepository.findByEmail).toHaveBeenCalledWith("staff@team-mir.ai");
    expect(invitationRepository.create).toHaveBeenCalledWith({
      email: "staff@team-mir.ai",
      roles: ["admin", "research_fund"],
      politicianIds: ["3", "12"],
      createdById: "admin-id",
    });
  });

  it("ロールも担当議員も無しで登録できる", async () => {
    const { usecase, invitationRepository } = setup();

    await usecase.execute("staff@team-mir.ai", [], []);

    expect(invitationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ roles: [], politicianIds: [] }),
    );
  });

  it("admin 以外は登録できない", async () => {
    const { usecase, invitationRepository } = setup(["research_fund"]);

    await expect(usecase.execute("staff@team-mir.ai", [], [])).rejects.toMatchObject({
      code: "INSUFFICIENT_PERMISSION",
    });
    expect(invitationRepository.create).not.toHaveBeenCalled();
  });

  it("ログインしていなければ登録できない", async () => {
    const { usecase, authProvider, invitationRepository } = setup();
    authProvider.getUser.mockResolvedValue(null);

    await expect(usecase.execute("staff@team-mir.ai", [], [])).rejects.toMatchObject({
      code: "AUTH_FAILED",
    });
    expect(invitationRepository.create).not.toHaveBeenCalled();
  });

  it("既にユーザーがいるメールアドレスには登録できない", async () => {
    const { usecase, userRepository, invitationRepository } = setup();
    userRepository.findByEmail.mockResolvedValue(createMockUser({ email: "Staff@team-mir.ai" }));

    await expect(usecase.execute("staff@team-mir.ai", [], [])).rejects.toMatchObject({
      code: "USER_ALREADY_EXISTS",
    });
    expect(invitationRepository.create).not.toHaveBeenCalled();
  });

  it("未使用の招待が既にあるメールアドレスには登録できない", async () => {
    const { usecase, invitationRepository } = setup();
    invitationRepository.findByEmail.mockResolvedValue(invitation());

    await expect(usecase.execute("STAFF@team-mir.ai", [], [])).rejects.toMatchObject({
      code: "INVITATION_ALREADY_EXISTS",
    });
    expect(invitationRepository.create).not.toHaveBeenCalled();
  });

  it("同じメールアドレスの招待が同時に登録されていたら、登録済みとして断る", async () => {
    const { usecase, invitationRepository } = setup();
    invitationRepository.create.mockResolvedValue(null);

    await expect(usecase.execute("staff@team-mir.ai", [], [])).rejects.toMatchObject({
      code: "INVITATION_ALREADY_EXISTS",
    });
  });

  it.each([
    ["不正なメールアドレス", "staff", [], [], "INVALID_EMAIL"],
    ["不明なロール", "staff@team-mir.ai", ["owner"], [], "INVALID_ROLE"],
    ["不正な議員の ID", "staff@team-mir.ai", [], ["abc"], "INVALID_ASSIGNMENT"],
  ])("%s は登録できない", async (_, email, roles, politicianIds, code) => {
    const { usecase, invitationRepository } = setup();

    await expect(usecase.execute(email, roles, politicianIds)).rejects.toMatchObject({ code });
    expect(invitationRepository.create).not.toHaveBeenCalled();
  });
});
