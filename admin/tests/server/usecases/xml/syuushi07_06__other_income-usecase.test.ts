import {
  Syuushi0706OtherIncomeUsecase,
  aggregateOtherIncomeFromTransactions,
  serializeOtherIncomeSection,
  resolveTransactionAmount,
  type SectionTransaction,
  type OtherIncomeSection,
} from "@/server/usecases/xml/syuushi07_06__other_income-usecase";
import type {
  ITransactionRepository,
  OtherIncomeTransaction,
} from "@/server/repositories/interfaces/transaction-repository.interface";

describe("Syuushi0706OtherIncomeUsecase", () => {
  let usecase: Syuushi0706OtherIncomeUsecase;
  let mockRepository: jest.Mocked<
    Pick<ITransactionRepository, "findOtherIncomeTransactions">
  >;

  beforeEach(() => {
    mockRepository = {
      findOtherIncomeTransactions: jest.fn(),
    };
    usecase = new Syuushi0706OtherIncomeUsecase(
      mockRepository as unknown as ITransactionRepository,
    );
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("generates section XML with proper structure", async () => {
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

      expect(result.filename).toBe("SYUUSHI07_06_123_2024.xml");
      expect(result.section.totalAmount).toBe(300000);
      expect(result.section.underThresholdAmount).toBe(50000);
      expect(result.section.rows).toHaveLength(2);

      const xml = result.sectionXml.toString();
      expect(xml).toContain("<SYUUSHI07_06>");
      expect(xml).toContain("<KINGAKU_GK>300000</KINGAKU_GK>");
      expect(xml).toContain("<MIMAN_GK>50000</MIMAN_GK>");
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
  });
});

describe("aggregateOtherIncomeFromTransactions", () => {
  it("splits transactions into detailed rows and under-threshold bucket", () => {
    const transactions: SectionTransaction[] = [
      {
        transactionNo: "1",
        label: "テスト取引1",
        description: "説明1",
        memo: null,
        amount: 150_000,
      },
      {
        transactionNo: "2",
        label: "テスト取引2",
        description: "説明2",
        memo: null,
        amount: 90_000,
      },
    ];
    const section = aggregateOtherIncomeFromTransactions(transactions);

    expect(section.totalAmount).toBe(240_000);
    expect(section.underThresholdAmount).toBe(90_000);
    expect(section.rows).toHaveLength(1);
    expect(section.rows[0]).toMatchObject({
      ichirenNo: "1",
      tekiyou: "テスト取引1",
      kingaku: 150_000,
    });
    expect(section.rows[0].bikou).toContain("MF行番号: 1");
  });

  it("sets underThresholdAmount to null when not applicable", () => {
    const transactions: SectionTransaction[] = [
      {
        transactionNo: "3",
        label: null,
        description: "ラベル未設定",
        memo: "テストメモ",
        amount: 120_000,
      },
    ];
    const section = aggregateOtherIncomeFromTransactions(transactions);

    expect(section.totalAmount).toBe(120_000);
    expect(section.underThresholdAmount).toBeNull();
    expect(section.rows[0].tekiyou).toBe("ラベル未設定");
    expect(section.rows[0].bikou).toContain("テストメモ");
    expect(section.rows[0].bikou).toContain("MF行番号: 3");
  });
});

describe("serializeOtherIncomeSection", () => {
  it("serializes section into XML with escaping", () => {
    const section: OtherIncomeSection = {
      totalAmount: 200_000,
      underThresholdAmount: null,
      rows: [
        {
          ichirenNo: "1",
          tekiyou: "テスト & サンプル",
          kingaku: 200_000,
          bikou: "<memo>",
        },
      ],
    };

    const xmlBuilder = serializeOtherIncomeSection(section);
    const xml = xmlBuilder.toString();

    expect(xml).toContain("<SYUUSHI07_06>");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&lt;memo&gt;");
    expect(xml).toContain("<MIMAN_GK/>");
  });
});

describe("resolveTransactionAmount", () => {
  it("uses creditAmount when available", () => {
    expect(resolveTransactionAmount(0, 150000)).toBe(150000);
  });

  it("falls back to debitAmount when creditAmount is zero", () => {
    expect(resolveTransactionAmount(120000, 0)).toBe(120000);
  });

  it("returns 0 when both are invalid", () => {
    expect(resolveTransactionAmount(NaN, NaN)).toBe(0);
  });
});

