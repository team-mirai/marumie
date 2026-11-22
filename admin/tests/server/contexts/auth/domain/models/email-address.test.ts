import { EmailAddressModel } from "@/server/contexts/auth/domain/models/email-address";

describe("EmailAddressModel", () => {
  describe("normalize", () => {
    it("前後の空白を除き、小文字にそろえる", () => {
      expect(EmailAddressModel.normalize("  Staff@Team-Mir.AI ")).toBe("staff@team-mir.ai");
    });

    it("大文字・小文字だけが違うメールアドレスは同じ値になる", () => {
      expect(EmailAddressModel.normalize("STAFF@team-mir.ai")).toBe(
        EmailAddressModel.normalize("staff@TEAM-MIR.ai"),
      );
    });

    it.each(["", "   ", "staff", "staff@", "@team-mir.ai", "staff@team-mir", "a b@team-mir.ai"])(
      "メールアドレスとして不正な値（%p）は null",
      (email) => {
        expect(EmailAddressModel.normalize(email)).toBeNull();
      },
    );

    it("255 文字ちょうどのメールアドレスは受け付ける", () => {
      const email = `${"a".repeat(249)}@x.com`;
      expect(EmailAddressModel.normalize(email)).toBe(email);
    });

    it("255 文字を超えるメールアドレスは null", () => {
      expect(EmailAddressModel.normalize(`${"a".repeat(250)}@x.com`)).toBeNull();
    });
  });
});
