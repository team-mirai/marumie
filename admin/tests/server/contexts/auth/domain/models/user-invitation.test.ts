import { UserInvitationModel } from "@/server/contexts/auth/domain/models/user-invitation";

describe("UserInvitationModel", () => {
  describe("normalizeEmail", () => {
    it("前後の空白を除き、小文字にそろえる", () => {
      expect(UserInvitationModel.normalizeEmail("  Staff@Team-Mir.AI ")).toBe("staff@team-mir.ai");
    });

    it("大文字・小文字だけが違うメールアドレスは同じ値になる", () => {
      expect(UserInvitationModel.normalizeEmail("STAFF@team-mir.ai")).toBe(
        UserInvitationModel.normalizeEmail("staff@TEAM-MIR.ai"),
      );
    });

    it.each(["", "   ", "staff", "staff@", "@team-mir.ai", "staff@team-mir", "a b@team-mir.ai"])(
      "メールアドレスとして不正な値（%p）は null",
      (email) => {
        expect(UserInvitationModel.normalizeEmail(email)).toBeNull();
      },
    );

    it("255 文字を超えるメールアドレスは null", () => {
      expect(UserInvitationModel.normalizeEmail(`${"a".repeat(250)}@x.com`)).toBeNull();
    });
  });

  describe("findConflict", () => {
    it("ユーザーも未使用の招待も無ければ登録できる", () => {
      expect(
        UserInvitationModel.findConflict({ hasUser: false, hasPendingInvitation: false }),
      ).toBeNull();
    });

    it("既にユーザーがいれば登録できない", () => {
      expect(UserInvitationModel.findConflict({ hasUser: true, hasPendingInvitation: false })).toBe(
        "USER_ALREADY_EXISTS",
      );
    });

    it("未使用の招待が既にあれば登録できない", () => {
      expect(UserInvitationModel.findConflict({ hasUser: false, hasPendingInvitation: true })).toBe(
        "INVITATION_ALREADY_EXISTS",
      );
    });

    it("両方あるときはユーザーがいることを理由にする", () => {
      expect(UserInvitationModel.findConflict({ hasUser: true, hasPendingInvitation: true })).toBe(
        "USER_ALREADY_EXISTS",
      );
    });
  });

  describe("canAcceptOnFirstLogin", () => {
    it("メールのリンク経由（招待リンクなど）なら使える", () => {
      expect(UserInvitationModel.canAcceptOnFirstLogin(null, false)).toBe(true);
    });

    it("許可ドメインの判定を通った Google ログインなら使える", () => {
      expect(UserInvitationModel.canAcceptOnFirstLogin("google", true)).toBe(true);
    });

    it("許可ドメインの判定を通っていない Google ログインでは使わない", () => {
      expect(UserInvitationModel.canAcceptOnFirstLogin("google", false)).toBe(false);
    });

    it("パスワードのログインでは使わない（持ち主を確かめられない）", () => {
      expect(UserInvitationModel.canAcceptOnFirstLogin("password", true)).toBe(false);
    });

    it("認証方式を判定できないログインでは使わない", () => {
      expect(UserInvitationModel.canAcceptOnFirstLogin("indeterminate", true)).toBe(false);
    });
  });
});
