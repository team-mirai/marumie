import { DonorCsvValidator } from "@/server/contexts/report/domain/services/donor-csv-validator";
import type {
  PreviewDonorCsvRow,
  TransactionForDonorCsv,
} from "@/server/contexts/report/domain/models/preview-donor-csv-row";

describe("DonorCsvValidator", () => {
  let validator: DonorCsvValidator;

  beforeEach(() => {
    validator = new DonorCsvValidator();
  });

  const createMockRow = (overrides: Partial<PreviewDonorCsvRow> = {}): PreviewDonorCsvRow => ({
    rowNumber: 1,
    transactionNo: "T2025-0001",
    name: "テスト太郎",
    donorType: "individual",
    address: "東京都渋谷区",
    occupation: "会社員",
    status: "valid",
    errors: [],
    transaction: null,
    matchingDonor: null,
    ...overrides,
  });

  const createMockTransaction = (
    overrides: Partial<TransactionForDonorCsv> = {},
  ): TransactionForDonorCsv => ({
    id: "tx-1",
    transactionNo: "T2025-0001",
    transactionDate: new Date("2025-06-01"),
    categoryKey: "individual-donations",
    friendlyCategory: "個人からの寄附",
    debitAmount: 10000,
    creditAmount: 10000,
    debitPartner: null,
    creditPartner: null,
    existingDonor: null,
    ...overrides,
  });

  describe("validate", () => {
    it("should return valid status for valid rows", () => {
      const rows = [createMockRow()];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("valid");
      expect(result[0].errors).toHaveLength(0);
      expect(result[0].transaction).not.toBeNull();
    });

    it("should detect duplicate transaction numbers within CSV", () => {
      const rows = [
        createMockRow({ rowNumber: 1, transactionNo: "T2025-0001" }),
        createMockRow({ rowNumber: 2, transactionNo: "T2025-0001" }),
      ];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors[0]).toContain("重複しています");
      expect(result[1].status).toBe("invalid");
      expect(result[1].errors[0]).toContain("重複しています");
    });

    it("should return invalid status when transactionNo is missing", () => {
      const rows = [createMockRow({ transactionNo: "" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>();

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("取引Noは必須です");
    });

    it("should return invalid status when name is missing", () => {
      const rows = [createMockRow({ name: "" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("寄付者名は必須です");
    });

    it("should return invalid status when name exceeds max length", () => {
      const longName = "あ".repeat(121);
      const rows = [createMockRow({ name: longName })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors[0]).toContain("寄付者名は120文字以内");
    });

    it("should return invalid status when donorType is null", () => {
      const rows = [createMockRow({ donorType: null })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("寄付者種別は必須です");
    });

    it("should return invalid status when address exceeds max length", () => {
      const longAddress = "あ".repeat(121);
      const rows = [createMockRow({ address: longAddress })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors[0]).toContain("住所は120文字以内");
    });

    it("should return invalid status when occupation exceeds max length", () => {
      const longOccupation = "あ".repeat(51);
      const rows = [createMockRow({ occupation: longOccupation })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors[0]).toContain("職業は50文字以内");
    });

    it("should return invalid status when individual donor has no occupation", () => {
      const rows = [createMockRow({ donorType: "individual", occupation: "" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("個人の寄付者の場合、職業は必須です");
    });

    it("should return invalid status when individual donor has null occupation", () => {
      const rows = [createMockRow({ donorType: "individual", occupation: null })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction()],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("個人の寄付者の場合、職業は必須です");
    });

    it("should return invalid status when corporation has occupation", () => {
      const rows = [createMockRow({ donorType: "corporation", occupation: "会社員" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction({ categoryKey: "corporate-donations" })],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("法人・政治団体の場合、職業は指定できません");
    });

    it("should return invalid status when political_organization has occupation", () => {
      const rows = [createMockRow({ donorType: "political_organization", occupation: "会社員" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction({ categoryKey: "political-donations" })],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors).toContain("法人・政治団体の場合、職業は指定できません");
    });

    it("should return transaction_not_found status when transaction does not exist", () => {
      const rows = [createMockRow({ transactionNo: "T2025-9999" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>();

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("transaction_not_found");
      expect(result[0].errors[0]).toContain("見つかりません");
    });

    it("should return type_mismatch status when donorType is not allowed for category", () => {
      const rows = [createMockRow({ donorType: "corporation", occupation: "" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction({ categoryKey: "individual-donations" })],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("type_mismatch");
      expect(result[0].errors[0]).toContain("指定できません");
    });

    it("should validate corporation donor without occupation", () => {
      const rows = [createMockRow({ donorType: "corporation", occupation: "" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction({ categoryKey: "corporate-donations" })],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("valid");
      expect(result[0].errors).toHaveLength(0);
    });

    it("should validate political_organization donor without occupation", () => {
      const rows = [createMockRow({ donorType: "political_organization", occupation: "" })];
      const transactionMap = new Map<string, TransactionForDonorCsv>([
        ["T2025-0001", createMockTransaction({ categoryKey: "political-donations" })],
      ]);

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("valid");
      expect(result[0].errors).toHaveLength(0);
    });

    it("should handle multiple validation errors", () => {
      const rows = [createMockRow({ transactionNo: "", name: "", donorType: null })];
      const transactionMap = new Map<string, TransactionForDonorCsv>();

      const result = validator.validate(rows, transactionMap);

      expect(result[0].status).toBe("invalid");
      expect(result[0].errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
