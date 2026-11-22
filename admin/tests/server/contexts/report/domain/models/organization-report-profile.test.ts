import {
  ORGANIZATION_REPORT_PROFILE_LIMITS,
  OrganizationReportProfile,
} from "@/server/contexts/report/domain/models/organization-report-profile";
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

describe("OrganizationReportProfile.validate の上限", () => {
  it("これまで入力スキーマにしか無かった上限も検証する", () => {
    const profile = createValidProfile();
    profile.officeAddressBuilding = "あ".repeat(61);
    profile.details.organizationType = "123";
    profile.details.fundManagement = { publicPositionName: "あ".repeat(61) };
    const errors = OrganizationReportProfile.validate(profile);

    expect(errors.map((e) => e.path)).toEqual([
      "profile.officeAddressBuilding",
      "profile.details.organizationType",
      "profile.details.fundManagement.publicPositionName",
    ]);
  });
});

describe("OrganizationReportProfile.validateForSave", () => {
  const LIMITS = ORGANIZATION_REPORT_PROFILE_LIMITS;
  const person = (id: string) => ({ id, lastName: "山田", firstName: "太郎" });
  const period = (id: string) => ({ id, from: "R6/1/1", to: "R6/12/31" });

  it("必須項目が空でもエラーを返さない", () => {
    const errors = OrganizationReportProfile.validateForSave({
      officialName: null,
      officialNameKana: null,
      officeAddress: null,
      officeAddressBuilding: null,
      details: { representative: { lastName: "", firstName: "" } },
    });

    expect(errors).toEqual([]);
  });

  it("details が無くてもエラーを返さない", () => {
    const errors = OrganizationReportProfile.validateForSave({
      officialName: "テスト政治団体",
      officialNameKana: null,
      officeAddress: null,
      officeAddressBuilding: null,
    });

    expect(errors).toEqual([]);
  });

  it("上限ちょうどの値はエラーにしない", () => {
    const errors = OrganizationReportProfile.validateForSave({
      officialName: "あ".repeat(LIMITS.officialName),
      officialNameKana: "あ".repeat(LIMITS.officialNameKana),
      officeAddress: "あ".repeat(LIMITS.officeAddress),
      officeAddressBuilding: "あ".repeat(LIMITS.officeAddressBuilding),
      details: {
        contactPersons: [1, 2, 3].map((i) => ({ ...person(`${i}`), tel: "0".repeat(LIMITS.tel) })),
        organizationType: "12",
      },
    });

    expect(errors).toEqual([]);
  });

  it("文字数の上限を超えた項目ごとにエラーを返す", () => {
    const errors = OrganizationReportProfile.validateForSave({
      officialName: "あ".repeat(LIMITS.officialName + 1),
      officialNameKana: "あ".repeat(LIMITS.officialNameKana + 1),
      officeAddress: "あ".repeat(LIMITS.officeAddress + 1),
      officeAddressBuilding: "あ".repeat(LIMITS.officeAddressBuilding + 1),
      details: {
        representative: { lastName: "あ".repeat(31), firstName: "太郎" },
        accountant: { lastName: "田中", firstName: "あ".repeat(31) },
        contactPersons: [
          person("1"),
          { id: "2", lastName: "あ".repeat(31), firstName: "あ".repeat(31), tel: "0".repeat(21) },
        ].map((p) => ({ tel: "", ...p })),
        organizationType: "123",
        specificPartyDate: "0".repeat(21),
      },
    });

    expect(errors.map((e) => [e.path, e.message])).toEqual([
      ["profile.officialName", "政治団体の名称は120文字以内で入力してください"],
      ["profile.officialNameKana", "政治団体の名称（ふりがな）は120文字以内で入力してください"],
      ["profile.officeAddress", "主たる事務所の所在地は80文字以内で入力してください"],
      ["profile.officeAddressBuilding", "主たる事務所の建物名等は60文字以内で入力してください"],
      ["profile.details.representative.lastName", "代表者の姓は30文字以内で入力してください"],
      ["profile.details.accountant.firstName", "会計責任者の名は30文字以内で入力してください"],
      [
        "profile.details.contactPersons[1].lastName",
        "事務担当者（2人目）の姓は30文字以内で入力してください",
      ],
      [
        "profile.details.contactPersons[1].firstName",
        "事務担当者（2人目）の名は30文字以内で入力してください",
      ],
      [
        "profile.details.contactPersons[1].tel",
        "事務担当者（2人目）の電話番号は20文字以内で入力してください",
      ],
      ["profile.details.organizationType", "団体区分は2文字以内で入力してください"],
      ["profile.details.specificPartyDate", "特定パーティーの開催日は20文字以内で入力してください"],
    ]);
    expect(errors.every((e) => e.code === ValidationErrorCode.MAX_LENGTH_EXCEEDED)).toBe(true);
  });

  it("資金管理団体の公職の名称・届出者・指定期間の上限を検証する", () => {
    const errors = OrganizationReportProfile.validateForSave({
      officialName: null,
      officialNameKana: null,
      officeAddress: null,
      officeAddressBuilding: null,
      details: {
        fundManagement: {
          publicPositionName: "あ".repeat(61),
          applicant: { lastName: "あ".repeat(31), firstName: "太郎" },
          periods: [period("1"), { id: "2", from: "0".repeat(21), to: "R6/12/31" }],
        },
      },
    });

    expect(errors.map((e) => e.path)).toEqual([
      "profile.details.fundManagement.publicPositionName",
      "profile.details.fundManagement.applicant.lastName",
      "profile.details.fundManagement.periods[1].from",
    ]);
  });

  it("国会議員関係政治団体の議員・指定期間の上限を検証する", () => {
    const errors = OrganizationReportProfile.validateForSave({
      officialName: null,
      officialNameKana: null,
      officeAddress: null,
      officeAddressBuilding: null,
      details: {
        dietMemberRelation: {
          type: "1",
          members: [
            { ...person("1"), firstName: "あ".repeat(31), chamber: "1", positionType: "1" },
          ],
          periods: [{ id: "1", from: "R6/1/1", to: "0".repeat(21) }],
        },
      },
    });

    expect(errors.map((e) => [e.path, e.message])).toEqual([
      [
        "profile.details.dietMemberRelation.members[0].firstName",
        "国会議員関係政治団体の議員（1人目）の名は30文字以内で入力してください",
      ],
      [
        "profile.details.dietMemberRelation.periods[0].to",
        "国会議員関係政治団体の指定期間（1件目）の終了日は20文字以内で入力してください",
      ],
    ]);
  });

  it("件数の上限を超えた一覧ごとにエラーを返す", () => {
    const errors = OrganizationReportProfile.validateForSave({
      officialName: null,
      officialNameKana: null,
      officeAddress: null,
      officeAddressBuilding: null,
      details: {
        contactPersons: ["1", "2", "3", "4"].map((id) => ({ ...person(id), tel: "" })),
        fundManagement: { periods: ["1", "2", "3", "4"].map(period) },
        dietMemberRelation: {
          type: "3",
          members: ["1", "2", "3", "4"].map((id) => ({
            ...person(id),
            chamber: "1" as const,
            positionType: "1" as const,
          })),
          periods: ["1", "2", "3", "4"].map(period),
        },
      },
    });

    expect(errors.map((e) => [e.path, e.message])).toEqual([
      ["profile.details.contactPersons", "事務担当者は3件まで登録できます"],
      ["profile.details.fundManagement.periods", "資金管理団体の指定期間は3件まで登録できます"],
      [
        "profile.details.dietMemberRelation.members",
        "国会議員関係政治団体の議員は3件まで登録できます",
      ],
      [
        "profile.details.dietMemberRelation.periods",
        "国会議員関係政治団体の指定期間は3件まで登録できます",
      ],
    ]);
    expect(errors.every((e) => e.code === ValidationErrorCode.MAX_COUNT_EXCEEDED)).toBe(true);
  });
});
