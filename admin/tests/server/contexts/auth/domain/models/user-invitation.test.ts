import { UserInvitationModel } from "@/server/contexts/auth/domain/models/user-invitation";

describe("UserInvitationModel", () => {
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
    it("招待メールのリンク経由なら使える", () => {
      expect(UserInvitationModel.canAcceptOnFirstLogin("invite", false)).toBe(true);
    });

    it("パスワード再設定・マジックリンクなどほかのメールのリンク経由では使わない（第三者が先にパスワード登録できる）", () => {
      expect(UserInvitationModel.canAcceptOnFirstLogin(null, true)).toBe(false);
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
