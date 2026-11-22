import {
  donorTypeRejectionReasonForCategory,
  getAllowedDonorTypes,
  getCommonAllowedDonorTypes,
  isDonorRequired,
  isDonorTypeAllowedForCategory,
} from "@/server/contexts/report/domain/models/donor-assignment-rules";

describe("donor-assignment-rules", () => {
  describe("isDonorRequired", () => {
    it("寄附とパーティー収入のカテゴリは寄付者の紐付け対象になる", () => {
      expect(isDonorRequired("individual-donations")).toBe(true);
      expect(isDonorRequired("corporate-donations")).toBe(true);
      expect(isDonorRequired("political-donations")).toBe(true);
    });

    it("寄附以外のカテゴリは紐付け対象にならない", () => {
      expect(isDonorRequired("membership-fees")).toBe(false);
    });
  });

  describe("寄付者の種別とカテゴリの組み合わせ", () => {
    it.each([
      ["individual-donations", ["individual"]],
      ["specific-individual-donations", ["individual"]],
      ["corporate-donations", ["corporation"]],
      ["political-donations", ["political_organization"]],
      ["membership-fees", []],
    ])("%s で許可される種別は %j", (categoryKey, expected) => {
      expect(getAllowedDonorTypes(categoryKey)).toEqual(expected);
    });

    it("個人からの寄附には個人の寄付者しか紐付けられない", () => {
      expect(isDonorTypeAllowedForCategory("individual-donations", "individual")).toBe(true);
      expect(isDonorTypeAllowedForCategory("individual-donations", "corporation")).toBe(false);
      expect(
        isDonorTypeAllowedForCategory("individual-donations", "political_organization"),
      ).toBe(false);
    });

    it("複数カテゴリで共通して許可される種別は積集合になる", () => {
      expect(getCommonAllowedDonorTypes(["individual-donations", "corporate-donations"])).toEqual(
        [],
      );
      expect(getCommonAllowedDonorTypes([])).toEqual([]);
    });
  });

  describe("donorTypeRejectionReasonForCategory", () => {
    it("許可された種別なら却下理由を返さない", () => {
      expect(
        donorTypeRejectionReasonForCategory(
          { categoryKey: "individual-donations", friendlyCategory: null },
          "individual",
        ),
      ).toBeNull();
    });

    it("許可されない種別なら表示用カテゴリ名と種別の名前で却下理由を返す", () => {
      expect(
        donorTypeRejectionReasonForCategory(
          { categoryKey: "individual-donations", friendlyCategory: "個人寄附" },
          "corporation",
        ),
      ).toBe("カテゴリ '個人寄附' に対して寄付者種別 '法人' は指定できません");
    });

    it("表示用カテゴリ名が無ければ勘定科目名を使い、内部のキーを出さない", () => {
      const reason = donorTypeRejectionReasonForCategory(
        { categoryKey: "individual-donations", friendlyCategory: null },
        "political_organization",
      );
      expect(reason).toContain("カテゴリ '個人からの寄附'");
      expect(reason).not.toContain("individual-donations");
      expect(reason).not.toContain("political_organization");
    });
  });
});
