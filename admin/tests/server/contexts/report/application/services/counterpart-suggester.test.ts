import {
  CounterpartSuggester,
  FrequencyStrategy,
  PartnerNameStrategy,
  createDefaultSuggester,
  type SuggestionContext,
} from "@/server/contexts/report/application/services/counterpart-suggester";
import type { ICounterpartRepository, CounterpartWithUsageAndLastUsed } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";

describe("CounterpartSuggester", () => {
  let mockRepository: jest.Mocked<ICounterpartRepository>;

  const createMockCounterpart = (overrides: Partial<CounterpartWithUsageAndLastUsed> = {}): CounterpartWithUsageAndLastUsed => ({
    id: "cp-1",
    name: "テスト取引先",
    postalCode: null,
    address: "東京都千代田区",
    usageCount: 5,
    lastUsedAt: new Date("2024-01-01"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  });

  const createMockTransaction = (overrides: Partial<TransactionWithCounterpart> = {}): TransactionWithCounterpart => ({
    id: "tx-1",
    transactionNo: "TX-001",
    transactionDate: new Date("2024-04-01"),
    financialYear: 2024,
    transactionType: "expense",
    categoryKey: "光熱水費",
    friendlyCategory: "電気料金",
    label: null,
    description: null,
    memo: null,
    debitAmount: 100000,
    creditAmount: 0,
    debitPartner: "電力会社",
    creditPartner: null,
    counterpart: null,
    requiresCounterpart: true,
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByNameAndAddress: jest.fn(),
      findAll: jest.fn(),
      findAllWithUsage: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getUsageCount: jest.fn(),
      count: jest.fn(),
      findByUsageFrequency: jest.fn(),
      findByPartnerName: jest.fn(),
    };
  });

  describe("FrequencyStrategy", () => {
    it("使用頻度の高い取引先を提案する", async () => {
      const strategy = new FrequencyStrategy();
      const counterparts = [
        createMockCounterpart({ id: "cp-1", name: "取引先A", usageCount: 10 }),
        createMockCounterpart({ id: "cp-2", name: "取引先B", usageCount: 5 }),
      ];
      mockRepository.findByUsageFrequency.mockResolvedValue(counterparts);

      const context: SuggestionContext = {
        politicalOrganizationId: "org-1",
        repository: mockRepository,
      };

      const suggestions = await strategy.suggest(createMockTransaction(), context);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].counterpart.name).toBe("取引先A");
      expect(suggestions[0].reason).toContain("使用回数: 10回");
      expect(suggestions[1].counterpart.name).toBe("取引先B");
    });

    it("スコアは順位に応じて減少する", async () => {
      const strategy = new FrequencyStrategy();
      const counterparts = [
        createMockCounterpart({ id: "cp-1", usageCount: 10 }),
        createMockCounterpart({ id: "cp-2", usageCount: 5 }),
        createMockCounterpart({ id: "cp-3", usageCount: 3 }),
      ];
      mockRepository.findByUsageFrequency.mockResolvedValue(counterparts);

      const context: SuggestionContext = {
        politicalOrganizationId: "org-1",
        repository: mockRepository,
      };

      const suggestions = await strategy.suggest(createMockTransaction(), context);

      expect(suggestions[0].score).toBeGreaterThan(suggestions[1].score);
      expect(suggestions[1].score).toBeGreaterThan(suggestions[2].score);
    });

    it("取引先がない場合は空の配列を返す", async () => {
      const strategy = new FrequencyStrategy();
      mockRepository.findByUsageFrequency.mockResolvedValue([]);

      const context: SuggestionContext = {
        politicalOrganizationId: "org-1",
        repository: mockRepository,
      };

      const suggestions = await strategy.suggest(createMockTransaction(), context);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe("PartnerNameStrategy", () => {
    it("取引先名に一致する取引先を提案する", async () => {
      const strategy = new PartnerNameStrategy();
      const counterparts = [
        createMockCounterpart({ id: "cp-1", name: "電力会社", usageCount: 3 }),
      ];
      mockRepository.findByPartnerName.mockResolvedValue(counterparts);

      const context: SuggestionContext = {
        politicalOrganizationId: "org-1",
        repository: mockRepository,
      };

      const transaction = createMockTransaction({ debitPartner: "電力会社" });
      const suggestions = await strategy.suggest(transaction, context);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].counterpart.name).toBe("電力会社");
      expect(suggestions[0].reason).toContain("取引先名「電力会社」");
    });

    it("取引先名がない場合は空の配列を返す", async () => {
      const strategy = new PartnerNameStrategy();

      const context: SuggestionContext = {
        politicalOrganizationId: "org-1",
        repository: mockRepository,
      };

      const transaction = createMockTransaction({ debitPartner: null, creditPartner: null });
      const suggestions = await strategy.suggest(transaction, context);

      expect(suggestions).toHaveLength(0);
      expect(mockRepository.findByPartnerName).not.toHaveBeenCalled();
    });

    it("creditPartnerも使用する", async () => {
      const strategy = new PartnerNameStrategy();
      const counterparts = [
        createMockCounterpart({ id: "cp-1", name: "ガス会社", usageCount: 2 }),
      ];
      mockRepository.findByPartnerName.mockResolvedValue(counterparts);

      const context: SuggestionContext = {
        politicalOrganizationId: "org-1",
        repository: mockRepository,
      };

      const transaction = createMockTransaction({ debitPartner: null, creditPartner: "ガス会社" });
      const suggestions = await strategy.suggest(transaction, context);

      expect(suggestions).toHaveLength(1);
      expect(mockRepository.findByPartnerName).toHaveBeenCalledWith("org-1", "ガス会社");
    });
  });

  describe("CounterpartSuggester", () => {
    it("複数のストラテジーからの提案を集約する", async () => {
      const counterpart1 = createMockCounterpart({ id: "cp-1", name: "取引先A", usageCount: 10 });
      const counterpart2 = createMockCounterpart({ id: "cp-2", name: "取引先B", usageCount: 5 });

      mockRepository.findByUsageFrequency.mockResolvedValue([counterpart1, counterpart2]);
      mockRepository.findByPartnerName.mockResolvedValue([counterpart1]);

      const suggester = new CounterpartSuggester(
        [new PartnerNameStrategy(), new FrequencyStrategy()],
        mockRepository,
      );

      const suggestions = await suggester.suggest(
        createMockTransaction({ debitPartner: "取引先A" }),
        "org-1",
      );

      expect(suggestions.length).toBeGreaterThan(0);
      const cp1Suggestion = suggestions.find(s => s.counterpart.id === "cp-1");
      expect(cp1Suggestion).toBeDefined();
    });

    it("同じ取引先のスコアを合算する", async () => {
      const counterpart = createMockCounterpart({ id: "cp-1", name: "共通取引先", usageCount: 5 });

      mockRepository.findByUsageFrequency.mockResolvedValue([counterpart]);
      mockRepository.findByPartnerName.mockResolvedValue([counterpart]);

      const suggester = new CounterpartSuggester(
        [new PartnerNameStrategy(), new FrequencyStrategy()],
        mockRepository,
      );

      const suggestions = await suggester.suggest(
        createMockTransaction({ debitPartner: "共通取引先" }),
        "org-1",
      );

      const cp1Suggestion = suggestions.find(s => s.counterpart.id === "cp-1");
      expect(cp1Suggestion).toBeDefined();
      expect(cp1Suggestion!.score).toBeGreaterThan(80);
    });

    it("スコア順にソートして返す", async () => {
      const counterpart1 = createMockCounterpart({ id: "cp-1", name: "取引先A", usageCount: 1 });
      const counterpart2 = createMockCounterpart({ id: "cp-2", name: "取引先B", usageCount: 10 });

      mockRepository.findByUsageFrequency.mockResolvedValue([counterpart2, counterpart1]);
      mockRepository.findByPartnerName.mockResolvedValue([]);

      const suggester = new CounterpartSuggester(
        [new FrequencyStrategy()],
        mockRepository,
      );

      const suggestions = await suggester.suggest(createMockTransaction(), "org-1");

      expect(suggestions[0].counterpart.id).toBe("cp-2");
    });

    it("limitで結果数を制限する", async () => {
      const counterparts = Array.from({ length: 10 }, (_, i) =>
        createMockCounterpart({ id: `cp-${i}`, name: `取引先${i}`, usageCount: 10 - i }),
      );

      mockRepository.findByUsageFrequency.mockResolvedValue(counterparts);
      mockRepository.findByPartnerName.mockResolvedValue([]);

      const suggester = new CounterpartSuggester(
        [new FrequencyStrategy()],
        mockRepository,
      );

      const suggestions = await suggester.suggest(createMockTransaction(), "org-1", 3);

      expect(suggestions).toHaveLength(3);
    });

    it("重複する理由は1つにまとめる", async () => {
      const counterpart = createMockCounterpart({ id: "cp-1", name: "取引先A", usageCount: 5 });

      mockRepository.findByUsageFrequency.mockResolvedValue([counterpart]);
      mockRepository.findByPartnerName.mockResolvedValue([counterpart]);

      const suggester = new CounterpartSuggester(
        [new PartnerNameStrategy(), new FrequencyStrategy()],
        mockRepository,
      );

      const suggestions = await suggester.suggest(
        createMockTransaction({ debitPartner: "取引先A" }),
        "org-1",
      );

      const cp1Suggestion = suggestions.find(s => s.counterpart.id === "cp-1");
      expect(cp1Suggestion).toBeDefined();
      const reasons = cp1Suggestion!.reason.split(", ");
      const uniqueReasons = new Set(reasons);
      expect(uniqueReasons.size).toBe(reasons.length);
    });
  });

  describe("createDefaultSuggester", () => {
    it("デフォルトのサジェスターを作成する", () => {
      const suggester = createDefaultSuggester(mockRepository);
      expect(suggester).toBeInstanceOf(CounterpartSuggester);
    });
  });
});
