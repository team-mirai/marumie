import {
  coerceDonorType,
  isDonorFormValid,
  resolveAllowedDonorTypes,
  toDonorFormSubmitData,
} from "@/client/lib/donor-form";
import { VALID_DONOR_TYPES } from "@/server/contexts/report/domain/models/donor";

describe("resolveAllowedDonorTypes", () => {
  it("未指定なら全種別を返す", () => {
    expect(resolveAllowedDonorTypes(undefined)).toEqual(VALID_DONOR_TYPES);
  });

  it("空配列なら全種別にフォールバックする（選択肢が消えてフォームが詰まらない）", () => {
    expect(resolveAllowedDonorTypes([])).toEqual(VALID_DONOR_TYPES);
  });

  it("指定があればその順序のまま返す", () => {
    expect(resolveAllowedDonorTypes(["political_organization", "corporation"])).toEqual([
      "political_organization",
      "corporation",
    ]);
  });

  it("呼び出し元の配列を返さず、コピーを返す", () => {
    const input: ("individual" | "corporation")[] = ["individual", "corporation"];
    const result = resolveAllowedDonorTypes(input);
    expect(result).not.toBe(input);
  });
});

describe("coerceDonorType", () => {
  it("許可されている種別はそのまま返す", () => {
    expect(coerceDonorType("corporation", ["individual", "corporation"])).toBe("corporation");
  });

  it("許可外の種別は許可リストの先頭に補正する", () => {
    expect(coerceDonorType("individual", ["corporation", "political_organization"])).toBe(
      "corporation",
    );
  });
});

describe("isDonorFormValid", () => {
  it("名前が空（空白のみ）なら無効", () => {
    expect(
      isDonorFormValid({ donorType: "corporation", name: "  ", address: "", occupation: "" }),
    ).toBe(false);
  });

  it("個人は職業が空なら無効", () => {
    expect(
      isDonorFormValid({ donorType: "individual", name: "山田", address: "", occupation: " " }),
    ).toBe(false);
  });

  it("個人は名前と職業が揃えば有効", () => {
    expect(
      isDonorFormValid({ donorType: "individual", name: "山田", address: "", occupation: "会社員" }),
    ).toBe(true);
  });

  it("法人・政治団体は職業が空でも有効", () => {
    expect(
      isDonorFormValid({ donorType: "corporation", name: "株式会社A", address: "", occupation: "" }),
    ).toBe(true);
    expect(
      isDonorFormValid({
        donorType: "political_organization",
        name: "B政治団体",
        address: "",
        occupation: "",
      }),
    ).toBe(true);
  });
});

describe("toDonorFormSubmitData", () => {
  it("前後の空白を除去し、空の住所は null にする", () => {
    expect(
      toDonorFormSubmitData({
        donorType: "individual",
        name: " 山田 太郎 ",
        address: "  ",
        occupation: " 会社員 ",
      }),
    ).toEqual({
      donorType: "individual",
      name: "山田 太郎",
      address: null,
      occupation: "会社員",
    });
  });

  it("個人以外は職業の入力が残っていても null にする", () => {
    expect(
      toDonorFormSubmitData({
        donorType: "corporation",
        name: "株式会社A",
        address: "東京都",
        occupation: "会社員",
      }),
    ).toEqual({
      donorType: "corporation",
      name: "株式会社A",
      address: "東京都",
      occupation: null,
    });
  });
});
