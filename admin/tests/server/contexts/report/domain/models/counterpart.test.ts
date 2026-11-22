import {
  type Counterpart,
  CounterpartDeletion,
  CounterpartInput,
  CounterpartUniqueness,
  MAX_ADDRESS_LENGTH,
  MAX_NAME_LENGTH,
  MAX_POSTAL_CODE_LENGTH,
} from "@/server/contexts/report/domain/models/counterpart";

const createCounterpart = (overrides: Partial<Counterpart> = {}): Counterpart => ({
  id: "cp-1",
  name: "テスト取引先",
  postalCode: "100-0001",
  address: "東京都千代田区",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

describe("CounterpartInput.normalize", () => {
  it("前後の空白を除く", () => {
    expect(
      CounterpartInput.normalize({
        name: "  テスト取引先  ",
        postalCode: "  123-4567  ",
        address: "  東京都  ",
      }),
    ).toEqual({ name: "テスト取引先", postalCode: "123-4567", address: "東京都" });
  });

  it("空・空白だけの郵便番号と住所は未登録（null）にする", () => {
    expect(CounterpartInput.normalize({ name: "テスト", postalCode: "   ", address: "" })).toEqual({
      name: "テスト",
      postalCode: null,
      address: null,
    });
  });
});

describe("CounterpartInput.normalizeUpdate", () => {
  it("渡されなかった項目は今の値のまま", () => {
    const existing = createCounterpart();
    expect(CounterpartInput.normalizeUpdate(existing, {})).toEqual({
      name: existing.name,
      postalCode: existing.postalCode,
      address: existing.address,
    });
  });

  it("渡された項目は作成と同じ規則で正規化する", () => {
    const existing = createCounterpart();
    expect(
      CounterpartInput.normalizeUpdate(existing, { name: "  新しい名前 ", postalCode: null, address: " " }),
    ).toEqual({ name: "新しい名前", postalCode: null, address: null });
  });
});

describe("CounterpartInput.validate", () => {
  const valid = { name: "テスト", postalCode: null, address: null };

  it("妥当な入力ならエラーを返さない", () => {
    expect(CounterpartInput.validate(valid)).toEqual([]);
  });

  it("名前が空・空白だけならエラー", () => {
    expect(CounterpartInput.validate({ ...valid, name: "" })).toEqual(["名前は必須です"]);
    expect(CounterpartInput.validate({ ...valid, name: "   " })).toEqual(["名前は必須です"]);
  });

  it("名前は最大長まで受け付け、超えるとエラー", () => {
    expect(CounterpartInput.validate({ ...valid, name: "あ".repeat(MAX_NAME_LENGTH) })).toEqual([]);
    expect(CounterpartInput.validate({ ...valid, name: "あ".repeat(MAX_NAME_LENGTH + 1) })).toEqual([
      `名前は${MAX_NAME_LENGTH}文字以内で入力してください`,
    ]);
  });

  it("郵便番号は最大長まで受け付け、超えるとエラー", () => {
    expect(
      CounterpartInput.validate({ ...valid, postalCode: "1".repeat(MAX_POSTAL_CODE_LENGTH) }),
    ).toEqual([]);
    expect(
      CounterpartInput.validate({ ...valid, postalCode: "1".repeat(MAX_POSTAL_CODE_LENGTH + 1) }),
    ).toEqual([`郵便番号は${MAX_POSTAL_CODE_LENGTH}文字以内で入力してください`]);
  });

  it("住所は最大長まで受け付け、超えるとエラー", () => {
    expect(CounterpartInput.validate({ ...valid, address: "あ".repeat(MAX_ADDRESS_LENGTH) })).toEqual(
      [],
    );
    expect(
      CounterpartInput.validate({ ...valid, address: "あ".repeat(MAX_ADDRESS_LENGTH + 1) }),
    ).toEqual([`住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`]);
  });

  it("複数の誤りはすべて返す", () => {
    expect(
      CounterpartInput.validate({
        name: "",
        postalCode: "1".repeat(MAX_POSTAL_CODE_LENGTH + 1),
        address: "あ".repeat(MAX_ADDRESS_LENGTH + 1),
      }),
    ).toEqual([
      "名前は必須です",
      `郵便番号は${MAX_POSTAL_CODE_LENGTH}文字以内で入力してください`,
      `住所は${MAX_ADDRESS_LENGTH}文字以内で入力してください`,
    ]);
  });
});

describe("CounterpartUniqueness.rejectionReason", () => {
  it("同じ名前・住所の取引先が無ければ登録できる", () => {
    expect(CounterpartUniqueness.rejectionReason(null)).toBeNull();
  });

  it("同じ名前・住所の取引先があれば却下理由を返す", () => {
    expect(CounterpartUniqueness.rejectionReason(createCounterpart({ id: "cp-2" }))).toBe(
      "同じ名前・住所の組み合わせが既に存在します",
    );
    expect(CounterpartUniqueness.rejectionReason(createCounterpart({ id: "cp-2" }), "cp-1")).toBe(
      "同じ名前・住所の組み合わせが既に存在します",
    );
  });

  it("見つかったのが自分自身なら更新できる", () => {
    expect(
      CounterpartUniqueness.rejectionReason(createCounterpart({ id: "cp-1" }), "cp-1"),
    ).toBeNull();
  });
});

describe("CounterpartDeletion.rejectionReason", () => {
  it("どの取引にも使われていなければ削除できる", () => {
    expect(CounterpartDeletion.rejectionReason(0)).toBeNull();
  });

  it("取引で使用中なら件数を含む却下理由を返す", () => {
    expect(CounterpartDeletion.rejectionReason(3)).toBe(
      "この取引先は3件のトランザクションで使用されています。削除するには先に関連するトランザクションを削除してください。",
    );
  });
});
