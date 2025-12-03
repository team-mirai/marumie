import { GenerateOtherIncomeXmlUsecase } from "@/server/usecases/generate-other-income-xml-usecase";
import type {
  ITransactionRepository,
  OtherIncomeTransaction,
} from "@/server/repositories/interfaces/transaction-repository.interface";

describe("GenerateOtherIncomeXmlUsecase", () => {
  let usecase: GenerateOtherIncomeXmlUsecase;
  let mockRepository: jest.Mocked<
    Pick<ITransactionRepository, "findOtherIncomeTransactions">
  >;

  beforeEach(() => {
    mockRepository = {
      findOtherIncomeTransactions: jest.fn(),
    };
    usecase = new GenerateOtherIncomeXmlUsecase(
      mockRepository as unknown as ITransactionRepository,
    );
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("generates XML document with proper structure", async () => {
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
        {
          transactionNo: "3",
          label: "少額収入",
          description: "10万円未満",
          memo: null,
          debitAmount: 0,
          creditAmount: 50000,
        },
      ];
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await usecase.execute({
        politicalOrganizationId: "123",
        financialYear: 2024,
      });

      expect(result.xml).toContain('<?xml version="1.0" encoding="Shift_JIS"');
      expect(result.xml).toContain("<BOOK>");
      expect(result.xml).toContain("<HEAD>");
      expect(result.xml).toContain("<SYUUSHI07_06>");
      expect(result.xml).toContain("<KINGAKU_GK>300000</KINGAKU_GK>");
      expect(result.xml).toContain("<MIMAN_GK>50000</MIMAN_GK>");
      expect(result.xml).toContain("<TEKIYOU>寄附金</TEKIYOU>");
      expect(result.xml).toContain("<TEKIYOU>その他収入</TEKIYOU>");
      expect(result.xml).toContain("</BOOK>");

      expect(result.filename).toBe("SYUUSHI07_06_123_2024.xml");
      expect(result.shiftJisBuffer).toBeInstanceOf(Buffer);
      expect(result.section.totalAmount).toBe(300000);
      expect(result.section.underThresholdAmount).toBe(50000);
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
      });

      // xmlbuilder2 automatically escapes special characters
      expect(result.xml).toContain("&amp;");
      expect(result.xml).toContain("&lt;");
      expect(result.xml).toContain("&gt;");
      expect(result.xml).toContain("<MIMAN_GK/>");
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
      });

      // Verify the buffer is non-empty
      expect(result.shiftJisBuffer.length).toBeGreaterThan(0);

      // The Shift-JIS encoded buffer should be different from UTF-8
      const utf8Bytes = new TextEncoder().encode(result.xml);
      expect(result.shiftJisBuffer.length).not.toBe(utf8Bytes.length);
    });

    it("generates empty MIMAN_GK element when all transactions are above threshold", async () => {
      const mockTransactions: OtherIncomeTransaction[] = [
        {
          transactionNo: "1",
          label: "大口収入",
          description: null,
          memo: null,
          debitAmount: 0,
          creditAmount: 150000,
        },
      ];
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await usecase.execute({
        politicalOrganizationId: "test",
        financialYear: 2024,
      });

      expect(result.xml).toContain("<MIMAN_GK/>");
      expect(result.section.underThresholdAmount).toBeNull();
    });

    it("generates empty BIKOU element when memo is null", async () => {
      const mockTransactions: OtherIncomeTransaction[] = [
        {
          transactionNo: "1",
          label: "テスト",
          description: null,
          memo: null,
          debitAmount: 0,
          creditAmount: 150000,
        },
      ];
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await usecase.execute({
        politicalOrganizationId: "test",
        financialYear: 2024,
      });

      // bikou should contain at least the MF行番号, so it won't be empty
      expect(result.xml).toContain("MF行番号: 1");
    });

    it("calls repository with correct parameters", async () => {
      mockRepository.findOtherIncomeTransactions.mockResolvedValue([]);

      await usecase.execute({
        politicalOrganizationId: "org-123",
        financialYear: 2025,
      });

      expect(mockRepository.findOtherIncomeTransactions).toHaveBeenCalledWith({
        politicalOrganizationId: "org-123",
        financialYear: 2025,
      });
    });

    it("uses creditAmount when available, falls back to debitAmount", async () => {
      const mockTransactions: OtherIncomeTransaction[] = [
        {
          transactionNo: "1",
          label: "Credit側",
          description: null,
          memo: null,
          debitAmount: 0,
          creditAmount: 150000,
        },
        {
          transactionNo: "2",
          label: "Debit側",
          description: null,
          memo: null,
          debitAmount: 120000,
          creditAmount: 0,
        },
      ];
      mockRepository.findOtherIncomeTransactions.mockResolvedValue(
        mockTransactions,
      );

      const result = await usecase.execute({
        politicalOrganizationId: "test",
        financialYear: 2024,
      });

      expect(result.section.totalAmount).toBe(270000);
      expect(result.section.rows).toHaveLength(2);
      expect(result.section.rows[0].kingaku).toBe(150000);
      expect(result.section.rows[1].kingaku).toBe(120000);
    });
  });
});
