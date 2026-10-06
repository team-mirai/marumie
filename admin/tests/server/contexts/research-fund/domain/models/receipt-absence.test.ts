import {
  canHaveReceiptAbsenceReason,
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

describe("徴し難かった事情を持てる仕訳", () => {
  test.each([
    ["書類の無い手動の支出", { source: "manual", documentId: null }, true],
    ["書類の無いスキャンの支出", { source: "scan", documentId: null }, true],
    ["書類のある支出", { source: "scan", documentId: "3" }, false],
    ["支給", { source: "grant", documentId: null }, false],
  ] as const)("%s", (_, entry, expected) => {
    expect(canHaveReceiptAbsenceReason(entry)).toBe(expected);
  });
});

describe("isReceiptMissing（書類も徴し難かった事情もない支出）", () => {
  test.each([
    ["書類も事情もない支出", { source: "manual", documentId: null, receiptAbsenceReason: null }, true],
    ["書類は無いが事情がある支出", { source: "manual", documentId: null, receiptAbsenceReason: "自動券売機で購入" }, false],
    ["書類のある支出", { source: "scan", documentId: "3", receiptAbsenceReason: null }, false],
    ["支給（書類を持たないが支出ではない）", { source: "grant", documentId: null, receiptAbsenceReason: null }, false],
  ] as const)("%s", (_, entry, expected) => {
    expect(isReceiptMissing(entry)).toBe(expected);
  });
});
