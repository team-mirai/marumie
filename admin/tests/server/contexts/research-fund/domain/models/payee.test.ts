import {
  isPayeeUnset,
  normalizeInvoiceRegistrationNumber,
  normalizePostalCode,
  payeeAccessRejection,
  payeeFormInputFromIssuer,
  sortPayees,
  validatePayeeInput,
  withSameDocumentEntries,
} from "@/server/contexts/research-fund/domain/models/payee";

const input = { name: "東京タクシー株式会社", postalCode: "100-0001", address: "東京都千代田区千代田1-1", invoiceRegistrationNumber: "T1234567890123" };

describe("validatePayeeInput", () => {
  test("前後の空白を落とし、郵便番号・インボイス登録番号を保存する形に揃える", () => {
    expect(validatePayeeInput({ name: "　東京タクシー ", postalCode: "〒１００ー０００１", address: " 東京都千代田区 ", invoiceRegistrationNumber: "ｔ1234-5678-90123" })).toEqual({
      status: "valid",
      value: { name: "東京タクシー", postalCode: "100-0001", address: "東京都千代田区", invoiceRegistrationNumber: "T1234567890123" },
    });
  });
  test("郵便番号・住所・インボイス登録番号は未入力でよい（住所は空文字、他は null）", () => {
    expect(validatePayeeInput({ name: "JR東日本", postalCode: " ", address: "", invoiceRegistrationNumber: "" })).toEqual({
      status: "valid",
      value: { name: "JR東日本", postalCode: null, address: "", invoiceRegistrationNumber: null },
    });
  });
  test.each([
    [{ name: "　" }, "名称を入力"],
    [{ name: "あ".repeat(256) }, "255文字以内"],
    [{ postalCode: "100-001" }, "郵便番号は7桁"],
    [{ postalCode: "abc-defg" }, "郵便番号は7桁"],
    [{ address: "あ".repeat(256) }, "住所は255文字以内"],
    [{ invoiceRegistrationNumber: "1234567890123" }, "T に続く13桁"],
    [{ invoiceRegistrationNumber: "T123" }, "T に続く13桁"],
  ])("不正な入力は理由つきで拒否する %j", (override, message) => {
    const result = validatePayeeInput({ ...input, ...override });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors[0].message).toContain(message);
      expect(result.errors[0].code).toBe("RF_INVALID_PAYEE");
    }
  });
  test("名称・住所はちょうど255文字まで受け付ける", () => {
    expect(validatePayeeInput({ ...input, name: "あ".repeat(255), address: "い".repeat(255) }).status).toBe("valid");
  });
});

test.each([
  ["1000001", "100-0001"],
  ["100 0001", "100-0001"],
  ["１００－０００１", "100-0001"],
  ["", null],
  ["12345678", undefined],
])("郵便番号の正規化 %s → %s", (value, expected) => {
  expect(normalizePostalCode(value)).toBe(expected);
});

test.each([
  ["T1234567890123", "T1234567890123"],
  ["Ｔ１２３４５６７８９０１２３", "T1234567890123"],
  ["T 1234 5678 90123", "T1234567890123"],
  ["", null],
  ["X1234567890123", undefined],
])("インボイス登録番号の正規化 %s → %s", (value, expected) => {
  expect(normalizeInvoiceRegistrationNumber(value)).toBe(expected);
});

describe("payeeAccessRejection（テナントの境界）", () => {
  test("同じ議員の支払先なら受け付ける", () => {
    expect(payeeAccessRejection({ politicianId: "1" }, "1")).toBeNull();
  });
  test("別の議員の支払先は存在を伝えず、見つからないとして拒否する", () => {
    expect(payeeAccessRejection({ politicianId: "2" }, "1")).toBe("支払先が見つかりません");
  });
  test("存在しない支払先も同じ理由で拒否する", () => {
    expect(payeeAccessRejection(null, "1")).toBe("支払先が見つかりません");
  });
});

describe("withSameDocumentEntries", () => {
  const a1 = { id: "1", source: "scan" as const, documentId: "10" };
  const a2 = { id: "2", source: "scan" as const, documentId: "10" };
  const b1 = { id: "3", source: "scan" as const, documentId: "20" };
  const manual = { id: "4", source: "manual" as const, documentId: null };
  const manual2 = { id: "5", source: "manual" as const, documentId: null };
  const grant = { id: "6", source: "grant" as const, documentId: "10" };
  const all = [a1, a2, b1, manual, manual2, grant];
  test("同じ書類から作られた仕訳を加える（支給は加えない）", () => {
    expect(withSameDocumentEntries([a1], all)).toEqual([a1, a2]);
  });
  test("書類の無い仕訳は、書類が無い同士でも加えない", () => {
    expect(withSameDocumentEntries([manual], all)).toEqual([manual]);
  });
  test("重ねて選んでも重複させない", () => {
    expect(withSameDocumentEntries([a2, a1, b1], all)).toEqual([a2, a1, b1]);
  });
});

test("支払先が未設定の支出だけを未設定とする（支給は対象外）", () => {
  expect(isPayeeUnset({ source: "scan", payeeId: null })).toBe(true);
  expect(isPayeeUnset({ source: "manual", payeeId: "1" })).toBe(false);
  expect(isPayeeUnset({ source: "grant", payeeId: null })).toBe(false);
});

test("支払先は名称順、同名なら住所順に並べる", () => {
  expect(sortPayees([{ name: "東京タクシー", address: "B" }, { name: "JR東日本", address: "" }, { name: "東京タクシー", address: "A" }])).toEqual([
    { name: "JR東日本", address: "" }, { name: "東京タクシー", address: "A" }, { name: "東京タクシー", address: "B" },
  ]);
});

describe("payeeFormInputFromIssuer", () => {
  const issuer = { name: "東京タクシー株式会社", address: "〒１００－０００１ 東京都千代田区千代田1-1", phone: "03-1234-5678", invoice_registration_number: "t1234567890123" };

  it("読み取った発行元を支払先の入力にし、住所の先頭の郵便番号を郵便番号の欄に移す", () => {
    const formInput = payeeFormInputFromIssuer(issuer);
    expect(formInput).toEqual({ name: "東京タクシー株式会社", postalCode: "100-0001", address: "東京都千代田区千代田1-1", invoiceRegistrationNumber: "T1234567890123" });
    expect(validatePayeeInput(formInput).status).toBe("valid");
  });

  it("形の合わないインボイス登録番号・読み取れなかった項目は未入力にする", () => {
    expect(payeeFormInputFromIssuer({ name: "JR東日本", address: null, phone: null, invoice_registration_number: "T123" })).toEqual({ name: "JR東日本", postalCode: "", address: "", invoiceRegistrationNumber: "" });
  });
});
