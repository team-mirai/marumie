import {
  XmlExportUsecase,
  KNOWN_FORM_IDS,
  FLAG_STRING_LENGTH,
} from "@/server/usecases/xml-export-usecase";
import type { DonationAssembler } from "@/server/usecases/assemblers/donation-assembler";
import type { ExpenseAssembler } from "@/server/usecases/assemblers/expense-assembler";
import type { IncomeAssembler } from "@/server/usecases/assemblers/income-assembler";
import type { IncomeData } from "@/server/domain/report-data";

describe("XmlExportUsecase", () => {
  let usecase: XmlExportUsecase;
  let mockDonationAssembler: jest.Mocked<DonationAssembler>;
  let mockIncomeAssembler: jest.Mocked<IncomeAssembler>;
  let mockExpenseAssembler: jest.Mocked<ExpenseAssembler>;

  beforeEach(() => {
    mockDonationAssembler = {
      assemble: jest.fn().mockResolvedValue({
        personalDonations: {
          totalAmount: 0,
          sonotaGk: 0,
          rows: [],
        },
      }),
    } as unknown as jest.Mocked<DonationAssembler>;
    mockIncomeAssembler = {
      assemble: jest.fn(),
    } as unknown as jest.Mocked<IncomeAssembler>;
    mockExpenseAssembler = {
      assemble: jest.fn().mockResolvedValue({
        utilityExpenses: {
          totalAmount: 0,
          underThresholdAmount: 0,
          rows: [],
        },
        suppliesExpenses: {
          totalAmount: 0,
          underThresholdAmount: 0,
          rows: [],
        },
        officeExpenses: {
          totalAmount: 0,
          underThresholdAmount: 0,
          rows: [],
        },
      }),
    } as unknown as jest.Mocked<ExpenseAssembler>;
    usecase = new XmlExportUsecase(
      mockDonationAssembler,
      mockIncomeAssembler,
      mockExpenseAssembler,
    );
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("generates complete XML document with proper structure", async () => {
      const mockIncomeData: IncomeData = {
        businessIncome: {
          totalAmount: 0,
          rows: [],
        },
        loanIncome: {
          totalAmount: 0,
          rows: [],
        },
        grantIncome: {
          totalAmount: 0,
          rows: [],
        },
        otherIncome: {
          totalAmount: 250000,
          underThresholdAmount: 0,
          rows: [
            {
              ichirenNo: "1",
              tekiyou: "その他の収入",
              kingaku: 150000,
              bikou: "MF行番号: 1",
            },
            {
              ichirenNo: "2",
              tekiyou: "その他の収入",
              kingaku: 100000,
              bikou: "MF行番号: 2",
            },
          ],
        },
      };
      mockIncomeAssembler.assemble.mockResolvedValue(mockIncomeData);

      const result = await usecase.execute({
        politicalOrganizationId: "123",
        financialYear: 2024,
      });

      expect(result.xml).toContain('<?xml version="1.0" encoding="Shift_JIS"');
      expect(result.xml).toContain("<BOOK>");
      expect(result.xml).toContain("<HEAD>");
      expect(result.xml).toContain("<VERSION>20081001</VERSION>");
      expect(result.xml).toContain("<SYUUSHI07_06>");
      expect(result.xml).toContain("<KINGAKU_GK>250000</KINGAKU_GK>");
      expect(result.xml).toContain("</BOOK>");

      expect(result.filename).toBe("report_123_2024.xml");
      expect(result.shiftJisBuffer).toBeInstanceOf(Buffer);
      expect(result.reportData.income.otherIncome.totalAmount).toBe(250000);
    });

    it("includes SYUUSHI_FLG section with correct flag for SYUUSHI07_06", async () => {
      const mockIncomeData: IncomeData = {
        businessIncome: {
          totalAmount: 0,
          rows: [],
        },
        loanIncome: {
          totalAmount: 0,
          rows: [],
        },
        grantIncome: {
          totalAmount: 0,
          rows: [],
        },
        otherIncome: {
          totalAmount: 100000,
          underThresholdAmount: 0,
          rows: [
            {
              ichirenNo: "1",
              tekiyou: "テスト",
              kingaku: 100000,
              bikou: "MF行番号: 1",
            },
          ],
        },
      };
      mockIncomeAssembler.assemble.mockResolvedValue(mockIncomeData);

      const result = await usecase.execute({
        politicalOrganizationId: "123",
        financialYear: 2024,
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
      const mockIncomeData: IncomeData = {
        businessIncome: {
          totalAmount: 0,
          rows: [],
        },
        loanIncome: {
          totalAmount: 0,
          rows: [],
        },
        grantIncome: {
          totalAmount: 0,
          rows: [],
        },
        otherIncome: {
          totalAmount: 200000,
          underThresholdAmount: 0,
          rows: [
            {
              ichirenNo: "1",
              tekiyou: "テスト & サンプル <特殊文字>",
              kingaku: 200000,
              bikou: '"引用符" & \'アポストロフィ\'',
            },
          ],
        },
      };
      mockIncomeAssembler.assemble.mockResolvedValue(mockIncomeData);

      const result = await usecase.execute({
        politicalOrganizationId: "456",
        financialYear: 2024,
      });

      expect(result.xml).toContain("&amp;");
      expect(result.xml).toContain("&lt;");
      expect(result.xml).toContain("&gt;");
    });

    it("generates correct Shift-JIS encoded bytes", async () => {
      const mockIncomeData: IncomeData = {
        businessIncome: {
          totalAmount: 0,
          rows: [],
        },
        loanIncome: {
          totalAmount: 0,
          rows: [],
        },
        grantIncome: {
          totalAmount: 0,
          rows: [],
        },
        otherIncome: {
          totalAmount: 100000,
          underThresholdAmount: 0,
          rows: [
            {
              ichirenNo: "1",
              tekiyou: "日本語テスト",
              kingaku: 100000,
              bikou: "備考欄",
            },
          ],
        },
      };
      mockIncomeAssembler.assemble.mockResolvedValue(mockIncomeData);

      const result = await usecase.execute({
        politicalOrganizationId: "789",
        financialYear: 2024,
      });

      expect(result.shiftJisBuffer.length).toBeGreaterThan(0);

      const utf8Bytes = new TextEncoder().encode(result.xml);
      expect(result.shiftJisBuffer.length).not.toBe(utf8Bytes.length);
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

  it("SYUUSHI07_06 is at index 5 in known form IDs", () => {
    expect(KNOWN_FORM_IDS.indexOf("SYUUSHI07_06")).toBe(5);
  });
});
