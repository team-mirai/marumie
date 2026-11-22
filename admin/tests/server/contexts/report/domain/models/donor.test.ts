import {
  type Donor,
  donorDeletionRejectionReason,
  duplicateDonorRejectionReason,
  normalizeDonorInput,
  prepareDonorInput,
  validateDonorInput,
} from "@/server/contexts/report/domain/models/donor";

const donor = (overrides: Partial<Donor> = {}): Donor => ({
  id: "1",
  donorType: "individual",
  name: "山田太郎",
  address: "東京都",
  occupation: "会社員",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  ...overrides,
});

describe("normalizeDonorInput", () => {
  it("前後の空白を除き、空の住所・職業は null にする", () => {
    expect(
      normalizeDonorInput({
        donorType: "individual",
        name: " 山田 太郎 ",
        address: "  ",
        occupation: " 会社員 ",
      }),
    ).toEqual({ donorType: "individual", name: "山田 太郎", address: null, occupation: "会社員" });
  });

  it("住所・職業が null でも扱える", () => {
    expect(
      normalizeDonorInput({ donorType: "individual", name: "山田", address: null, occupation: null }),
    ).toEqual({ donorType: "individual", name: "山田", address: null, occupation: null });
  });

  it.each(["corporation", "political_organization"] as const)(
    "個人以外（%s）に入力された職業は保存しない",
    (donorType) => {
      expect(
        normalizeDonorInput({ donorType, name: "A", address: null, occupation: "会社員" })
          .occupation,
      ).toBeNull();
    },
  );

  it("種別が未確定なら職業は残す", () => {
    expect(
      normalizeDonorInput({ donorType: null, name: "A", address: null, occupation: "会社員" })
        .occupation,
    ).toBe("会社員");
  });
});

describe("validateDonorInput", () => {
  const valid = { donorType: "individual" as const, name: "山田", address: null, occupation: "会社員" };

  it("問題が無ければ空配列を返す", () => {
    expect(validateDonorInput(valid)).toEqual([]);
  });

  it("名前は必須", () => {
    expect(validateDonorInput({ ...valid, name: "" })).toEqual(["名前は必須です"]);
  });

  it("名前は120文字まで", () => {
    expect(validateDonorInput({ ...valid, name: "あ".repeat(120) })).toEqual([]);
    expect(validateDonorInput({ ...valid, name: "あ".repeat(121) })).toEqual([
      "名前は120文字以内で入力してください",
    ]);
  });

  it("住所は120文字まで", () => {
    expect(validateDonorInput({ ...valid, address: "あ".repeat(121) })).toEqual([
      "住所は120文字以内で入力してください",
    ]);
  });

  it("個人は職業が必須", () => {
    expect(validateDonorInput({ ...valid, occupation: null })).toEqual([
      "個人の場合、職業は必須です",
    ]);
  });

  it("職業は50文字まで", () => {
    expect(validateDonorInput({ ...valid, occupation: "あ".repeat(51) })).toEqual([
      "職業は50文字以内で入力してください",
    ]);
  });

  it("個人以外は職業が無くてよい", () => {
    expect(validateDonorInput({ ...valid, donorType: "corporation", occupation: null })).toEqual(
      [],
    );
  });

  it("種別は必須", () => {
    expect(validateDonorInput({ ...valid, donorType: null })).toEqual(["寄付者種別は必須です"]);
  });
});

describe("prepareDonorInput", () => {
  it("正規化した入力を返す", () => {
    expect(
      prepareDonorInput({
        donorType: "corporation",
        name: " 株式会社A ",
        address: "",
        occupation: "会社員",
      }),
    ).toEqual({
      success: true,
      input: { donorType: "corporation", name: "株式会社A", address: null, occupation: null },
    });
  });

  it("正規化した後の値で検証する（空白だけの名前は未入力）", () => {
    expect(
      prepareDonorInput({ donorType: "individual", name: "  ", address: null, occupation: " " }),
    ).toEqual({ success: false, errors: ["名前は必須です", "個人の場合、職業は必須です"] });
  });
});

describe("duplicateDonorRejectionReason", () => {
  const message = "同じ名前・住所・種別の組み合わせが既に存在します";
  const candidate = { name: "山田太郎", address: "東京都", donorType: "individual" as const };

  it("同一性のキーが一致する寄付者がいれば却下理由を返す", () => {
    expect(duplicateDonorRejectionReason(candidate, [donor()])).toBe(message);
  });

  it("名前・住所・種別のどれかが違えば重複ではない", () => {
    expect(duplicateDonorRejectionReason(candidate, [donor({ name: "山田花子" })])).toBeNull();
    expect(duplicateDonorRejectionReason(candidate, [donor({ address: "大阪府" })])).toBeNull();
    expect(
      duplicateDonorRejectionReason(candidate, [donor({ donorType: "corporation" })]),
    ).toBeNull();
  });

  it("住所の未登録（null）と空文字は同じ寄付者とみなす", () => {
    expect(
      duplicateDonorRejectionReason({ ...candidate, address: null }, [donor({ address: "" })]),
    ).toBe(message);
  });

  it("更新では自分自身を重複に数えない", () => {
    const current = donor({ id: "1", name: "山田" });
    expect(duplicateDonorRejectionReason(candidate, [donor({ id: "1" })], current)).toBeNull();
    expect(duplicateDonorRejectionReason(candidate, [donor({ id: "2" })], current)).toBe(message);
  });

  it("名前・住所・種別を変えない更新は、既に重複があっても止めない", () => {
    expect(duplicateDonorRejectionReason(candidate, [donor({ id: "2" })], donor({ id: "1" }))).toBeNull();
  });
});

describe("donorDeletionRejectionReason", () => {
  it("使用中の寄付者も削除できる（紐付けが外れる）", () => {
    expect(donorDeletionRejectionReason(0)).toBeNull();
    expect(donorDeletionRejectionReason(3)).toBeNull();
  });
});
