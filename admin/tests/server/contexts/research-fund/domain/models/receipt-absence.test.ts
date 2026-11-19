import {
  canHaveReceiptAbsenceReason,
  canMarkReceiptAbsent,
  isReceiptAbsenceReasonMissing,
  isReceiptMissing,
  normalizeReceiptAbsenceReason,
  RECEIPT_ABSENCE_REASON_MAX_LENGTH,
  validateReceiptAbsenceReason,
} from "@/server/contexts/research-fund/domain/models/receipt-absence";

describe("validateReceiptAbsenceReason", () => {
  test("前後の空白（全角スペース・改行を含む）を落として保存する", () => {
    expect(validateReceiptAbsenceReason("　自動券売機で購入したため\n")).toEqual({ status: "valid", value: "自動券売機で購入したため" });
  });
  test.each(["", " ", "　\n"])("空白だけなら未入力（null）として扱う %j", value => {
    expect(normalizeReceiptAbsenceReason(value)).toBeNull();
    expect(validateReceiptAbsenceReason(value)).toEqual({ status: "valid", value: null });
  });
  test("上限ちょうどは受け付け、超えたら理由つきで拒否する", () => {
    expect(validateReceiptAbsenceReason("あ".repeat(RECEIPT_ABSENCE_REASON_MAX_LENGTH)).status).toBe("valid");
    const result = validateReceiptAbsenceReason("あ".repeat(RECEIPT_ABSENCE_REASON_MAX_LENGTH + 1));
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.errors[0].message).toContain(`${RECEIPT_ABSENCE_REASON_MAX_LENGTH}文字以内`);
      expect(result.errors[0].code).toBe("RF_INVALID_RECEIPT_ABSENCE_REASON");
    }
  });
});

describe("徴難を付け外しできる仕訳（書類の有無は問わない）", () => {
  test.each([
    ["手動の支出", { source: "manual" }, true],
    ["スキャンの支出", { source: "scan" }, true],
    ["支給", { source: "grant" }, false],
  ] as const)("%s", (_, entry, expected) => {
    expect(canMarkReceiptAbsent(entry)).toBe(expected);
  });
});

describe("徴し難かった事情を持てる仕訳（徴難の支出だけ。書類の有無は問わない）", () => {
  test.each([
    ["徴難の支出", { source: "manual", receiptAbsent: true }, true],
    ["徴難でない支出", { source: "manual", receiptAbsent: false }, false],
    ["支給", { source: "grant", receiptAbsent: false }, false],
  ] as const)("%s", (_, entry, expected) => {
    expect(canHaveReceiptAbsenceReason(entry)).toBe(expected);
  });
});

describe("isReceiptMissing（書類が無く、徴難も付いていない支出）", () => {
  test.each([
    ["書類なし・徴難なしの支出", { source: "manual", documentId: null, receiptAbsent: false }, true],
    ["書類なし・徴難の支出", { source: "manual", documentId: null, receiptAbsent: true }, false],
    ["書類のある支出", { source: "scan", documentId: "3", receiptAbsent: false }, false],
    ["支給（書類を持たないが支出ではない）", { source: "grant", documentId: null, receiptAbsent: false }, false],
  ] as const)("%s", (_, entry, expected) => {
    expect(isReceiptMissing(entry)).toBe(expected);
  });
});

describe("isReceiptAbsenceReasonMissing（徴難なのに事情が未入力の支出）", () => {
  const base = { source: "scan", documentId: "3", receiptAbsent: true, receiptAbsenceReason: null } as const;
  test.each([
    ["書類のある徴難の支出で事情が未入力", base, true],
    ["書類の無い徴難の支出で事情が未入力", { ...base, documentId: null }, true],
    ["徴難の支出で事情が入力済み", { ...base, receiptAbsenceReason: "振込のみで領収書が発行されない" }, false],
    ["徴難でない支出", { ...base, receiptAbsent: false }, false],
  ] as const)("%s", (_, entry, expected) => {
    expect(isReceiptAbsenceReasonMissing(entry)).toBe(expected);
  });
});
