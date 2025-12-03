import { GenerateOtherIncomeXmlUsecase } from "@/server/usecases/generate-other-income-xml-usecase";

// Mock the buildOtherIncomeSection function
jest.mock("@/server/xml/sections/syuushi07_06__other_income", () => {
  const actual = jest.requireActual(
    "@/server/xml/sections/syuushi07_06__other_income",
  );
  return {
    ...actual,
    buildOtherIncomeSection: jest.fn(),
  };
});

import { buildOtherIncomeSection } from "@/server/xml/sections/syuushi07_06__other_income";

const mockBuildOtherIncomeSection =
  buildOtherIncomeSection as jest.MockedFunction<typeof buildOtherIncomeSection>;

describe("GenerateOtherIncomeXmlUsecase", () => {
  let usecase: GenerateOtherIncomeXmlUsecase;

  beforeEach(() => {
    usecase = new GenerateOtherIncomeXmlUsecase();
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("generates XML document with proper structure", async () => {
      mockBuildOtherIncomeSection.mockResolvedValue({
        totalAmount: 300000,
        underThresholdAmount: 50000,
        rows: [
          {
            ichirenNo: "1",
            tekiyou: "寄附金",
            kingaku: 150000,
            bikou: "MF行番号: 1",
          },
          {
            ichirenNo: "2",
            tekiyou: "その他収入",
            kingaku: 100000,
            bikou: "MF行番号: 2",
          },
        ],
      });

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
    });

    it("properly escapes special XML characters", async () => {
      mockBuildOtherIncomeSection.mockResolvedValue({
        totalAmount: 200000,
        underThresholdAmount: null,
        rows: [
          {
            ichirenNo: "1",
            tekiyou: "テスト & サンプル <特殊文字>",
            kingaku: 200000,
            bikou: '"引用符" & \'アポストロフィ\'',
          },
        ],
      });

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
      mockBuildOtherIncomeSection.mockResolvedValue({
        totalAmount: 100000,
        underThresholdAmount: null,
        rows: [
          {
            ichirenNo: "1",
            tekiyou: "日本語テスト",
            kingaku: 100000,
            bikou: "備考欄",
          },
        ],
      });

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

    it("generates empty MIMAN_GK element when underThresholdAmount is null", async () => {
      mockBuildOtherIncomeSection.mockResolvedValue({
        totalAmount: 150000,
        underThresholdAmount: null,
        rows: [
          {
            ichirenNo: "1",
            tekiyou: "テスト",
            kingaku: 150000,
          },
        ],
      });

      const result = await usecase.execute({
        politicalOrganizationId: "test",
        financialYear: 2024,
      });

      expect(result.xml).toContain("<MIMAN_GK/>");
    });

    it("generates empty BIKOU element when bikou is undefined", async () => {
      mockBuildOtherIncomeSection.mockResolvedValue({
        totalAmount: 150000,
        underThresholdAmount: null,
        rows: [
          {
            ichirenNo: "1",
            tekiyou: "テスト",
            kingaku: 150000,
            // bikou is undefined
          },
        ],
      });

      const result = await usecase.execute({
        politicalOrganizationId: "test",
        financialYear: 2024,
      });

      expect(result.xml).toContain("<BIKOU/>");
    });

    it("calls buildOtherIncomeSection with correct parameters", async () => {
      mockBuildOtherIncomeSection.mockResolvedValue({
        totalAmount: 0,
        underThresholdAmount: null,
        rows: [],
      });

      await usecase.execute({
        politicalOrganizationId: "org-123",
        financialYear: 2025,
      });

      expect(mockBuildOtherIncomeSection).toHaveBeenCalledWith({
        politicalOrganizationId: "org-123",
        financialYear: 2025,
      });
    });
  });
});

