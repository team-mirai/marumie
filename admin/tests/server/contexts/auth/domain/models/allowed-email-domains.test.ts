import { AllowedEmailDomains } from "@/server/contexts/auth/domain/models/allowed-email-domains";

describe("AllowedEmailDomains", () => {
  describe("parse", () => {
    it("カンマ区切りの値をパースする", () => {
      expect(AllowedEmailDomains.parse("team-mir.ai,example.com")).toEqual({
        domains: ["team-mir.ai", "example.com"],
      });
    });

    it("空白をトリムし小文字に正規化する", () => {
      expect(AllowedEmailDomains.parse(" Team-Mir.AI , Example.com ")).toEqual({
        domains: ["team-mir.ai", "example.com"],
      });
    });

    it("未設定・空文字の場合は空リストを返す", () => {
      expect(AllowedEmailDomains.parse(undefined)).toEqual({ domains: [] });
      expect(AllowedEmailDomains.parse("")).toEqual({ domains: [] });
      expect(AllowedEmailDomains.parse(" , ")).toEqual({ domains: [] });
    });
  });

  describe("isAllowed", () => {
    const restricted = AllowedEmailDomains.parse("team-mir.ai");

    it("許可リストが空の場合はドメインを判定できるメールアドレスを許可する", () => {
      const noRestriction = AllowedEmailDomains.parse(undefined);
      expect(AllowedEmailDomains.isAllowed(noRestriction, "anyone@example.com")).toBe(true);
    });

    it("許可リストが空でもドメインを判定できないメールアドレスは拒否する", () => {
      const noRestriction = AllowedEmailDomains.parse(undefined);
      expect(AllowedEmailDomains.isAllowed(noRestriction, null)).toBe(false);
      expect(AllowedEmailDomains.isAllowed(noRestriction, "not-an-email")).toBe(false);
      expect(AllowedEmailDomains.isAllowed(noRestriction, "trailing@")).toBe(false);
    });

    it("許可ドメインのメールアドレスを許可する", () => {
      expect(AllowedEmailDomains.isAllowed(restricted, "member@team-mir.ai")).toBe(true);
    });

    it("ドメインは大文字小文字を区別しない", () => {
      expect(AllowedEmailDomains.isAllowed(restricted, "member@Team-Mir.AI")).toBe(true);
    });

    it("許可ドメイン外のメールアドレスを拒否する", () => {
      expect(AllowedEmailDomains.isAllowed(restricted, "outsider@example.com")).toBe(false);
    });

    it("サブドメインは別ドメインとして拒否する", () => {
      expect(AllowedEmailDomains.isAllowed(restricted, "member@sub.team-mir.ai")).toBe(false);
    });

    it("許可ドメインで終わるだけの別ドメインを拒否する", () => {
      expect(AllowedEmailDomains.isAllowed(restricted, "member@evilteam-mir.ai")).toBe(false);
    });

    it("メールがnull・不正な形式の場合は拒否する", () => {
      expect(AllowedEmailDomains.isAllowed(restricted, null)).toBe(false);
      expect(AllowedEmailDomains.isAllowed(restricted, "not-an-email")).toBe(false);
    });
  });
});
