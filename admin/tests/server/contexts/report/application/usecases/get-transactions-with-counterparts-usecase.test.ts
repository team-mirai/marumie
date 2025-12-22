import {
  GetTransactionsWithCounterpartsUsecase,
  type GetTransactionsWithCounterpartsInput,
} from "@/server/contexts/report/application/usecases/get-transactions-with-counterparts-usecase";
import type { ITransactionWithCounterpartRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type {
  TransactionWithCounterpart,
  TransactionWithCounterpartFilters,
} from "@/server/contexts/report/domain/models/transaction-with-counterpart";

describe("GetTransactionsWithCounterpartsUsecase", () => {
  const createMockTransaction = (
    overrides?: Partial<TransactionWithCounterpart>,
  ): TransactionWithCounterpart => ({
    id: "1",
    transactionNo: "TXN001",
    transactionDate: new Date("2024-04-01"),
    financialYear: 2024,
    transactionType: "expense",
    categoryKey: "office-expenses",
    friendlyCategory: "事務所費",
    label: null,
    description: "事務用品購入",
    memo: null,
    debitAmount: 150000,
    creditAmount: 0,
    debitPartner: null,
    creditPartner: null,
    counterpart: null,
    requiresCounterpart: true,
    ...overrides,
  });

  const createMockRepository = (): jest.Mocked<ITransactionWithCounterpartRepository> => ({
    findTransactionsWithCounterparts: jest.fn(),
  });

  describe("ページネーション・フィルタリング・結果構造", () => {
    it("デフォルト値の適用、フィルタへの変換、結果構造が正しい", async () => {
      const mockRepository = createMockRepository();
      const mockTransactions = [
        createMockTransaction({ id: "1", transactionNo: "TXN001" }),
        createMockTransaction({ id: "2", transactionNo: "TXN002" }),
        createMockTransaction({ id: "3", transactionNo: "TXN003" }),
      ];
      mockRepository.findTransactionsWithCounterparts.mockResolvedValue({
        transactions: mockTransactions,
        total: 100,
      });

      const usecase = new GetTransactionsWithCounterpartsUsecase(mockRepository);
      const input: GetTransactionsWithCounterpartsInput = {
        politicalOrganizationId: "123",
        financialYear: 2024,
      };
      const result = await usecase.execute(input);

      // リポジトリに渡されるフィルタを検証（デフォルト値が適用されている）
      const calledFilters = mockRepository.findTransactionsWithCounterparts.mock
        .calls[0][0] as TransactionWithCounterpartFilters;
      expect(calledFilters).toEqual({
        politicalOrganizationId: "123",
        financialYear: 2024,
        unassignedOnly: undefined,
        requiresCounterpartOnly: undefined,
        categoryKey: undefined,
        searchQuery: undefined,
        limit: 50, // デフォルト perPage
        offset: 0, // (page=1 - 1) * 50
        sortField: undefined,
        sortOrder: undefined,
      });

      // 結果構造を検証
      expect(result).toEqual({
        transactions: mockTransactions,
        total: 100,
        page: 1, // デフォルト
        perPage: 50, // デフォルト
      });
      expect(result.transactions).toHaveLength(3);
    });
  });

  describe("カスタムページネーションとオフセット計算", () => {
    it("page=3, perPage=20 の場合、offset=40 でリポジトリを呼び出す", async () => {
      const mockRepository = createMockRepository();
      mockRepository.findTransactionsWithCounterparts.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const usecase = new GetTransactionsWithCounterpartsUsecase(mockRepository);
      const result = await usecase.execute({
        politicalOrganizationId: "123",
        financialYear: 2024,
        page: 3,
        perPage: 20,
      });

      const calledFilters = mockRepository.findTransactionsWithCounterparts.mock
        .calls[0][0] as TransactionWithCounterpartFilters;
      expect(calledFilters.limit).toBe(20);
      expect(calledFilters.offset).toBe(40); // (3 - 1) * 20

      expect(result.page).toBe(3);
      expect(result.perPage).toBe(20);
    });
  });

  describe("すべてのフィルタオプションの受け渡し", () => {
    it("すべてのオプションがリポジトリに正しく渡される", async () => {
      const mockRepository = createMockRepository();
      mockRepository.findTransactionsWithCounterparts.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const usecase = new GetTransactionsWithCounterpartsUsecase(mockRepository);
      await usecase.execute({
        politicalOrganizationId: "456",
        financialYear: 2023,
        unassignedOnly: true,
        requiresCounterpartOnly: true,
        categoryKey: "utilities",
        searchQuery: "電気代",
        page: 2,
        perPage: 25,
        sortField: "debitAmount",
        sortOrder: "desc",
      });

      const calledFilters = mockRepository.findTransactionsWithCounterparts.mock
        .calls[0][0] as TransactionWithCounterpartFilters;
      expect(calledFilters).toEqual({
        politicalOrganizationId: "456",
        financialYear: 2023,
        unassignedOnly: true,
        requiresCounterpartOnly: true,
        categoryKey: "utilities",
        searchQuery: "電気代",
        limit: 25,
        offset: 25, // (2 - 1) * 25
        sortField: "debitAmount",
        sortOrder: "desc",
      });
    });
  });

  describe("counterpart情報を含む取引の取得", () => {
    it("counterpart紐づけ済みの取引が正しく返される", async () => {
      const mockRepository = createMockRepository();
      const transactionWithCounterpart = createMockTransaction({
        id: "1",
        counterpart: {
          id: "cp-1",
          name: "株式会社テスト",
          address: "東京都千代田区1-1-1",
        },
        requiresCounterpart: true,
      });
      const transactionWithoutCounterpart = createMockTransaction({
        id: "2",
        counterpart: null,
        requiresCounterpart: true,
      });
      mockRepository.findTransactionsWithCounterparts.mockResolvedValue({
        transactions: [transactionWithCounterpart, transactionWithoutCounterpart],
        total: 2,
      });

      const usecase = new GetTransactionsWithCounterpartsUsecase(mockRepository);
      const result = await usecase.execute({
        politicalOrganizationId: "123",
        financialYear: 2024,
      });

      expect(result.transactions[0].counterpart).toEqual({
        id: "cp-1",
        name: "株式会社テスト",
        address: "東京都千代田区1-1-1",
      });
      expect(result.transactions[1].counterpart).toBeNull();
    });
  });
});
