import { MfRecordConverter } from "@/server/contexts/data-import/infrastructure/mf/mf-record-converter";
import { MfCsvRecord } from "@/server/contexts/data-import/domain/models/mf-csv-record";

describe("MfRecordConverter", () => {
  let converter: MfRecordConverter;

  beforeEach(() => {
    converter = new MfRecordConverter();
  });

  describe("convertRow", () => {
    const createMockRecord = (
      overrides: Partial<MfCsvRecord> = {},
    ): MfCsvRecord => ({
      transaction_no: "1",
      transaction_date: "2025/6/6",
      debit_account: "テスト借方",
      debit_sub_account: "",
      debit_department: "",
      debit_partner: "",
      debit_tax_category: "",
      debit_invoice: "",
      debit_amount: "1000",
      credit_account: "テスト貸方",
      credit_sub_account: "",
      credit_department: "",
      credit_partner: "",
      credit_tax_category: "",
      credit_invoice: "",
      credit_amount: "1000",
      description: "",
      friendly_category: "テストカテゴリ",
      memo: "",
      ...overrides,
    });

    it("should convert string amounts to integers", () => {
      const record = createMockRecord({
        debit_amount: "1500000",
        credit_amount: "500000",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.debit_amount).toBe(1500000);
      expect(result.credit_amount).toBe(500000);
    });

    it("should handle amounts with commas", () => {
      const record = createMockRecord({
        debit_amount: "1,500,000",
        credit_amount: "500,000",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.debit_amount).toBe(1500000);
      expect(result.credit_amount).toBe(500000);
    });

    it("空の金額は 0 円にせず、理由つきの無効な行にする", () => {
      const record = createMockRecord({
        debit_account: "普通預金",
        credit_account: "個人からの寄附",
        debit_amount: "",
        credit_amount: "",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.status).toBe("invalid");
      expect(result.errors).toEqual([
        '借方金額を解釈できません: ""',
        '貸方金額を解釈できません: ""',
      ]);
    });

    it.each(["invalid", "abc123", "123abc", "1000.5"])(
      "数値として解釈できない金額 %s は理由つきの無効な行にする",
      (amount) => {
        const record = createMockRecord({
          debit_account: "普通預金",
          credit_account: "個人からの寄附",
          debit_amount: amount,
        });

        const result = converter.convertRow(record, "test-org-id");

        expect(result.status).toBe("invalid");
        expect(result.errors).toEqual([`借方金額を解釈できません: "${amount}"`]);
      },
    );

    it("解釈できない取引日は理由つきの無効な行にする", () => {
      const record = createMockRecord({
        debit_account: "普通預金",
        credit_account: "個人からの寄附",
        transaction_date: "not-a-date",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.status).toBe("invalid");
      expect(result.errors).toEqual(["Invalid date format: not-a-date"]);
    });

    it("正常な行は取引種別とカテゴリを付けて insert にする", () => {
      const record = createMockRecord({
        debit_account: "普通預金",
        credit_account: "個人からの寄附",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.status).toBe("insert");
      expect(result.errors).toEqual([]);
      expect(result.transaction_type).toBe("income");
      expect(result.category_key).toBe("individual-donations");
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should set label when description starts with デビット", () => {
      const record = createMockRecord({
        description: "デビット1 123456 TEST",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.label).toBe("デビット1 123456 TEST");
    });

    it("should set label when memo contains upsider (case-insensitive)", () => {
      const record = createMockRecord({
        description: "通常の明細",
        memo: "Upsider",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.label).toBe("通常の明細");
    });

    it("should set label when description contains amex (case-insensitive)", () => {
      const record = createMockRecord({
        description: "AMEX 123456 TEST",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.label).toBe("AMEX 123456 TEST");
    });

    it("should not set label when conditions are not met", () => {
      const record = createMockRecord({
        description: "通常の明細",
        memo: "別のメモ",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.label).toBeUndefined();
    });


    it("should preserve all other fields from the original record", () => {
      const record = createMockRecord({
        transaction_no: "123",
        transaction_date: "2025/12/31",
        debit_account: "普通預金",
        debit_sub_account: "テスト銀行",
        friendly_category: "テストタグ",
        memo: "テストメモ",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.political_organization_id).toBe("test-org-id");
      expect(result.transaction_no).toBe("123");
      expect(result.transaction_date).toEqual(new Date("2025/12/31"));
      expect(result.debit_account).toBe("普通預金");
      expect(result.debit_sub_account).toBe("テスト銀行");
      expect(result.friendly_category).toBe("テストタグ");
    });

    it("should preserve friendly_category field as-is", () => {
      const record = createMockRecord({
        friendly_category: "テストタグ値",
      });

      const result = converter.convertRow(record, "test-org-id");

      expect(result.friendly_category).toBe("テストタグ値");
    });
  });

});
