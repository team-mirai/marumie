import {
  XmlExportUsecase,
  KNOWN_FORM_IDS,
  FLAG_STRING_LENGTH,
  SECTION_TO_FORM_ID,
} from "@/server/usecases/xml-export-usecase";
import type {
  ITransactionXmlRepository,
  OtherIncomeTransaction,
} from "@/server/repositories/interfaces/transaction-xml-repository.interface";

describe("XmlExportUsecase", () => {
  let usecase: XmlExportUsecase;
  let mockRepository: jest.Mocked<ITransactionXmlRepository>;

  beforeEach(() => {
    mockRepository = {
      findOtherIncomeTransactions: jest.fn(),
    };
    usecase = new XmlExportUsecase(mockRepository);
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("generates complete XML document with proper structure", async () => {
      const mockTransactions: OtherIncomeTransaction[] = [
        {
          transactionNo: "1",
          label: "寄附金",
          description: "寄附金収入",
          memo: null,
          debitAmount: 0,
          creditAmount: 150000,
        },
        {
          transactionNo: "2",
          label: "その他収入",
          description: "その他の収入",
          memo: null,
          debitAmount: 0,
          creditAmount: 100000,
        },
      ];
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await usecase.execute({
        politicalOrganizationId: "123",
        financialYear: 2024,
        section: "other-income",
      });

      expect(result.xml).toContain('<?xml version="1.0" encoding="Shift_JIS"');
      expect(result.xml).toContain("<BOOK>");
      expect(result.xml).toContain("<HEAD>");
      expect(result.xml).toContain("<VERSION>20081001</VERSION>");
      expect(result.xml).toContain("<SYUUSHI07_06>");
      expect(result.xml).toContain("<KINGAKU_GK>250000</KINGAKU_GK>");
      expect(result.xml).toContain("</BOOK>");

      expect(result.filename).toBe("SYUUSHI07_06_123_2024.xml");
      expect(result.shiftJisBuffer).toBeInstanceOf(Buffer);
      expect(result.sectionData.totalAmount).toBe(250000);
    });

    it("includes SYUUSHI_FLG section with correct flag for other-income", async () => {
      const mockTransactions: OtherIncomeTransaction[] = [
        {
          transactionNo: "1",
          label: "テスト",
          description: null,
          memo: null,
          debitAmount: 0,
          creditAmount: 100000,
        },
      ];
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await usecase.execute({
        politicalOrganizationId: "123",
        financialYear: 2024,
        section: "other-income",
      });

      // SYUUSHI_FLG should be present
      expect(result.xml).toContain("<SYUUSHI_FLG>");
      expect(result.xml).toContain("<SYUUSHI_UMU_FLG>");
      expect(result.xml).toContain("<SYUUSHI_UMU>");

      // SYUUSHI07_06 is at index 5 (0-based), so the flag string should have a 1 at position 5
      // Expected: "000001" + "0".repeat(45) = 51 chars total
      const expectedFlagStart = "000001";
      expect(result.xml).toContain(expectedFlagStart);
    });

    it("properly escapes special XML characters", async () => {
      const mockTransactions: OtherIncomeTransaction[] = [
        {
          transactionNo: "1",
          label: "テスト & サンプル <特殊文字>",
          description: null,
          memo: '"引用符" & \'アポストロフィ\'',
          debitAmount: 0,
          creditAmount: 200000,
        },
      ];
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await usecase.execute({
        politicalOrganizationId: "456",
        financialYear: 2024,
        section: "other-income",
      });

      expect(result.xml).toContain("&amp;");
      expect(result.xml).toContain("&lt;");
      expect(result.xml).toContain("&gt;");
    });

    it("generates correct Shift-JIS encoded bytes", async () => {
      const mockTransactions: OtherIncomeTransaction[] = [
        {
          transactionNo: "1",
          label: "日本語テスト",
          description: null,
          memo: "備考欄",
          debitAmount: 0,
          creditAmount: 100000,
        },
      ];
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await usecase.execute({
        politicalOrganizationId: "789",
        financialYear: 2024,
        section: "other-income",
      });

      expect(result.shiftJisBuffer.length).toBeGreaterThan(0);

      const utf8Bytes = new TextEncoder().encode(result.xml);
      expect(result.shiftJisBuffer.length).not.toBe(utf8Bytes.length);
    });

    it("throws error for unsupported section type", async () => {
      await expect(
        usecase.execute({
          politicalOrganizationId: "123",
          financialYear: 2024,
          section: "unsupported" as any,
        }),
      ).rejects.toThrow("Unsupported section type: unsupported");
    });
  });
});

describe("SYUUSHI_FLG constants", () => {
  it("has 23 known form IDs", () => {
    expect(KNOWN_FORM_IDS).toHaveLength(23);
  });

  it("has flag string length of 51", () => {
    expect(FLAG_STRING_LENGTH).toBe(51);
  });

  it("maps other-income to SYUUSHI07_06", () => {
    expect(SECTION_TO_FORM_ID["other-income"]).toBe("SYUUSHI07_06");
  });

  it("SYUUSHI07_06 is at index 5 in known form IDs", () => {
    expect(KNOWN_FORM_IDS.indexOf("SYUUSHI07_06")).toBe(5);
  });
});
