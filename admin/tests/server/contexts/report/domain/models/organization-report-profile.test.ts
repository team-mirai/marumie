import { OrganizationReportProfile } from "@/server/contexts/report/domain/models/organization-report-profile";
import { ValidationErrorCode } from "@/server/contexts/report/domain/types/validation";

const createValidProfile = (): OrganizationReportProfile => ({
  id: "1",
  politicalOrganizationId: "org-1",
  financialYear: 2024,
  officialName: "テスト政治団体",
  officialNameKana: "テストセイジダンタイ",
  officeAddress: "東京都千代田区",
  officeAddressBuilding: null,
  details: {
    representative: {
      lastName: "山田",
      firstName: "太郎",
    },
    accountant: {
      lastName: "田中",
      firstName: "花子",
    },
    activityArea: "1",
    dietMemberRelation: {
      type: "0",
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("OrganizationReportProfile.validate", () => {
  it("正常なデータでエラーを返さない", () => {
    const profile = createValidProfile();
    const errors = OrganizationReportProfile.validate(profile);

    expect(errors).toHaveLength(0);
  });

  describe("報告年 (financialYear)", () => {
    it("報告年が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.financialYear = 0;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.REQUIRED)).toBe(true);
    });

    it("報告年が4桁未満の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.financialYear = 123;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.INVALID_FORMAT)).toBe(true);
    });

    it("報告年が4桁を超える場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.financialYear = 12345;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.INVALID_FORMAT)).toBe(true);
    });
  });

  describe("政治団体名称 (officialName)", () => {
    it("政治団体名称が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.officialName = null;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.officialName")).toBe(true);
    });

    it("政治団体名称が120文字を超える場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.officialName = "あ".repeat(121);
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.MAX_LENGTH_EXCEEDED)).toBe(true);
    });
  });

  describe("政治団体ふりがな (officialNameKana)", () => {
    it("政治団体ふりがなが未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.officialNameKana = null;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.officialNameKana")).toBe(true);
    });

    it("政治団体ふりがなが120文字を超える場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.officialNameKana = "あ".repeat(121);
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.MAX_LENGTH_EXCEEDED)).toBe(true);
    });
  });

  describe("事務所住所 (officeAddress)", () => {
    it("事務所住所が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.officeAddress = null;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.officeAddress")).toBe(true);
    });

    it("事務所住所が80文字を超える場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.officeAddress = "あ".repeat(81);
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.MAX_LENGTH_EXCEEDED)).toBe(true);
    });
  });

  describe("代表者 (representative)", () => {
    it("代表者が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.representative = undefined;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.details.representative")).toBe(true);
    });

    it("代表者の姓が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.representative = { lastName: "", firstName: "太郎" };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.details.representative.lastName")).toBe(true);
    });

    it("代表者の名が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.representative = { lastName: "山田", firstName: "" };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.details.representative.firstName")).toBe(true);
    });

    it("代表者の姓が30文字を超える場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.representative = { lastName: "あ".repeat(31), firstName: "太郎" };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.MAX_LENGTH_EXCEEDED)).toBe(true);
    });

    it("代表者の名が30文字を超える場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.representative = { lastName: "山田", firstName: "あ".repeat(31) };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.MAX_LENGTH_EXCEEDED)).toBe(true);
    });
  });

  describe("会計責任者 (accountant)", () => {
    it("会計責任者が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.accountant = undefined;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.details.accountant")).toBe(true);
    });

    it("会計責任者の姓が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.accountant = { lastName: "", firstName: "花子" };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.details.accountant.lastName")).toBe(true);
    });

    it("会計責任者の名が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.accountant = { lastName: "田中", firstName: "" };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.details.accountant.firstName")).toBe(true);
    });

    it("会計責任者の姓が30文字を超える場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.accountant = { lastName: "あ".repeat(31), firstName: "花子" };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.MAX_LENGTH_EXCEEDED)).toBe(true);
    });

    it("会計責任者の名が30文字を超える場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.accountant = { lastName: "田中", firstName: "あ".repeat(31) };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.MAX_LENGTH_EXCEEDED)).toBe(true);
    });
  });

  describe("活動区域 (activityArea)", () => {
    it("活動区域が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.activityArea = undefined;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.details.activityArea")).toBe(true);
    });

    it("活動区域が不正な値の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.activityArea = "3" as "1" | "2";
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.INVALID_VALUE)).toBe(true);
    });
  });

  describe("国会議員関係政治団体の区分 (dietMemberRelation)", () => {
    it("国会議員関係政治団体の区分が未入力の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.dietMemberRelation = undefined;
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.path === "profile.details.dietMemberRelation")).toBe(true);
    });

    it("国会議員関係政治団体の区分が不正な値の場合エラーを返す", () => {
      const profile = createValidProfile();
      profile.details.dietMemberRelation = { type: "4" as "0" | "1" | "2" | "3" };
      const errors = OrganizationReportProfile.validate(profile);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === ValidationErrorCode.INVALID_VALUE)).toBe(true);
    });
  });

  it("複数のエラーを集約する", () => {
    const profile = createValidProfile();
    profile.financialYear = 123;
    profile.officialName = null;
    profile.officialNameKana = null;
    const errors = OrganizationReportProfile.validate(profile);

    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
