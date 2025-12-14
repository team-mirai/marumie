import { TransactionValidator } from "@/server/contexts/data-import/domain/services/transaction-validator";
import { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

describe("TransactionValidator", () => {
  let validator: TransactionValidator;

  beforeEach(() => {
    validator = new TransactionValidator();
  });

  const createMockTransaction = (
    overrides: Partial<PreviewTransaction> = {},
  ): PreviewTransaction => ({
    political_organization_id: "org1",
    transaction_no: "1",
    transaction_date: new Date("2025-06-06"),
    transaction_type: "expense",
    debit_account: "人件費",
    debit_sub_account: undefined,
    debit_amount: 1000,
    credit_account: "普通預金",
    credit_sub_account: undefined,
    credit_amount: 1000,
    description: undefined,
    label: undefined,
    friendly_category: "テストカテゴリ",
    category_key: "personnel",
    hash: "test-hash",
    status: "insert",
    errors: [],
    ...overrides,
  });

  describe("validatePreviewTransactions", () => {
    it("should not modify valid transactions", () => {
      const transactions = [
        createMockTransaction({
          debit_account: "人件費",
          credit_account: "普通預金",
        }),
        createMockTransaction({
          debit_account: "普通預金",
          credit_account: "個人からの寄附",
          transaction_type: "income",
        }),
      ];

      const result = validator.validatePreviewTransactions(transactions);

      expect(result[0].status).toBe("insert");
      expect(result[0].errors).toHaveLength(0);
      expect(result[1].status).toBe("insert");
      expect(result[1].errors).toHaveLength(0);
    });

    it("should mark transactions as skip when duplicate", () => {
      const transactions = [
        createMockTransaction({
          transaction_no: "DUP001",
          hash: "test-hash", // 同じハッシュに設定
        }),
      ];

      const existingTransactions = [{
        id: "existing-1",
        political_organization_id: "org-1",
        transaction_no: "DUP001",
        transaction_date: new Date(),
        financial_year: 2024,
        transaction_type: "expense" as const,
        debit_account: "人件費",
        debit_amount: 100000,
        credit_account: "普通預金",
        credit_amount: 100000,
        description: "existing transaction",
        friendly_category: "既存カテゴリ",
        memo: "",
        category_key: "personnel",
        label: "",
        hash: "test-hash", // 同じハッシュに設定
        created_at: new Date(),
        updated_at: new Date(),
      }];

      const result = validator.validatePreviewTransactions(transactions, existingTransactions);

      expect(result[0].status).toBe("skip");
      expect(result[0].errors).toContain("重複のためスキップされます");
    });

    it("should mark transactions as invalid for invalid debit account", () => {
      const transactions = [
        createMockTransaction({
          debit_account: "無効な借方科目",
        }),
      ];

      const result = validator.validatePreviewTransactions(transactions);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain('無効な借方科目: "無効な借方科目"');
    });

    it("should mark transactions as invalid for invalid credit account", () => {
      const transactions = [
        createMockTransaction({
          credit_account: "無効な貸方科目",
        }),
      ];

      const result = validator.validatePreviewTransactions(transactions);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain('無効な貸方科目: "無効な貸方科目"');
    });

    it("should mark transactions as invalid for missing friendly_category", () => {
      const transactions = [
        createMockTransaction({
          friendly_category: "",
        }),
      ];

      const result = validator.validatePreviewTransactions(transactions);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("独自のカテゴリが設定されていません");
    });

    it("should allow empty friendly_category for offset transactions", () => {
      const transactions = [
        createMockTransaction({
          debit_account: "相殺項目（費用）",
          friendly_category: "",
          transaction_type: "offset_expense",
        }),
        createMockTransaction({
          credit_account: "相殺項目（収入）",
          friendly_category: "",
          transaction_type: "offset_income",
        }),
      ];

      const result = validator.validatePreviewTransactions(transactions);

      expect(result[0].status).toBe("insert");
      expect(result[0].errors).toHaveLength(0);
      expect(transactions[1].status).toBe("insert");
      expect(transactions[1].errors).toHaveLength(0);
    });

    it("should preserve existing errors and add validation errors", () => {
      const transactions = [
        createMockTransaction({
          debit_account: "無効な借方科目",
          status: "invalid",
          errors: ["既存のエラー"],
        }),
      ];

      const result = validator.validatePreviewTransactions(transactions);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("既存のエラー");
      expect(result[0].errors).toContain('無効な借方科目: "無効な借方科目"');
    });

    it("should handle multiple validation errors", () => {
      const transactions = [
        createMockTransaction({
          debit_account: "無効な借方科目",
          credit_account: "無効な貸方科目",
          friendly_category: "",
        }),
      ];

      const result = validator.validatePreviewTransactions(transactions);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain('無効な借方科目: "無効な借方科目"');
      expect(result[0].errors).toContain('無効な貸方科目: "無効な貸方科目"');
      expect(result[0].errors).toContain("独自のカテゴリが設定されていません");
    });

    it("should add validation errors even if already invalid from conversion", () => {
      const transactions = [
        createMockTransaction({
          debit_account: "無効な借方科目",
          status: "invalid",
          errors: ["変換エラー"],
        }),
      ];

      const result = validator.validatePreviewTransactions(transactions);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("変換エラー");
      expect(result[0].errors).toContain('無効な借方科目: "無効な借方科目"');
    });

    it("should prioritize validation errors over duplicate check", () => {
      const transactions = [
        createMockTransaction({
          transaction_no: "DUP001",
          debit_account: "無効な借方科目",
        }),
      ];

      const existingTransactions = [{
        id: "existing-2",
        political_organization_id: "org-1",
        transaction_no: "DUP001",
        transaction_date: new Date(),
        financial_year: 2024,
        transaction_type: "expense" as const,
        debit_account: "人件費",
        debit_amount: 100000,
        credit_account: "普通預金",
        credit_amount: 100000,
        description: "existing transaction 2",
        friendly_category: "既存カテゴリ",
        memo: "",
        category_key: "personnel",
        label: "",
        hash: "existing-hash-2",
        created_at: new Date(),
        updated_at: new Date(),
      }];

      const result = validator.validatePreviewTransactions(transactions, existingTransactions);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain('無効な借方科目: "無効な借方科目"');
      // Should not contain duplicate messages since validation takes priority
      expect(result[0].errors).not.toContain("重複のためスキップされます");
    });
  });
});