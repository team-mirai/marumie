import {
  GetCounterpartTransactionsUsecase,
  type GetCounterpartTransactionsInput,
} from "@/server/contexts/report/application/usecases/get-counterpart-transactions-usecase";
import type { ITransactionWithCounterpartRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type {
  TransactionWithCounterpart,
  TransactionByCounterpartFilters,
} from "@/server/contexts/report/domain/models/transaction-with-counterpart";

describe("GetCounterpartTransactionsUsecase", () => {
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
    counterpart: {
      id: "cp-1",
      name: "株式会社テスト",
      address: "東京都千代田区1-1-1",
    },
    requiresCounterpart: true,
    ...overrides,
  });

  const createMockRepository = (): jest.Mocked<ITransactionWithCounterpartRepository> => ({
    findTransactionsWithCounterparts: jest.fn(),
    findByCounterpart: jest.fn(),
    existsById: jest.fn(),
    findExistingIds: jest.fn(),
    findByIdWithCounterpart: jest.fn(),
  });

  describe("ページネーション・フィルタリング・結果構造", () => {
    it("デフォルト値の適用、フィルタへの変換、結果構造が正しい", async () => {
      const mockRepository = createMockRepository();
      const mockTransactions = [
        createMockTransaction({ id: "1", transactionNo: "TXN001" }),
        createMockTransaction({ id: "2", transactionNo: "TXN002" }),
        createMockTransaction({ id: "3", transactionNo: "TXN003" }),
      ];
      mockRepository.findByCounterpart.mockResolvedValue({
        transactions: mockTransactions,
        total: 100,
      });

      const usecase = new GetCounterpartTransactionsUsecase(mockRepository);
      const input: GetCounterpartTransactionsInput = {
        counterpartId: "123",
      };
      const result = await usecase.execute(input);

      const calledFilters = mockRepository.findByCounterpart.mock
        .calls[0][0] as TransactionByCounterpartFilters;
      expect(calledFilters).toEqual({
        counterpartId: "123",
        politicalOrganizationId: undefined,
        financialYear: undefined,
        limit: 50,
        offset: 0,
        sortField: undefined,
        sortOrder: undefined,
      });

      expect(result).toEqual({
        transactions: mockTransactions,
        total: 100,
        page: 1,
        perPage: 50,
      });
      expect(result.transactions).toHaveLength(3);
    });
  });

  describe("カスタムページネーションとオフセット計算", () => {
    it("page=3, perPage=20 の場合、offset=40 でリポジトリを呼び出す", async () => {
      const mockRepository = createMockRepository();
      mockRepository.findByCounterpart.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const usecase = new GetCounterpartTransactionsUsecase(mockRepository);
      const result = await usecase.execute({
        counterpartId: "123",
        page: 3,
        perPage: 20,
      });

      const calledFilters = mockRepository.findByCounterpart.mock
        .calls[0][0] as TransactionByCounterpartFilters;
      expect(calledFilters.limit).toBe(20);
      expect(calledFilters.offset).toBe(40);

      expect(result.page).toBe(3);
      expect(result.perPage).toBe(20);
    });

    it("不正なページネーションパラメータは安全な値に補正される", async () => {
      const mockRepository = createMockRepository();
      mockRepository.findByCounterpart.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const usecase = new GetCounterpartTransactionsUsecase(mockRepository);

      const result = await usecase.execute({
        counterpartId: "123",
        page: 0,
        perPage: -5,
      });

      const calledFilters = mockRepository.findByCounterpart.mock
        .calls[0][0] as TransactionByCounterpartFilters;
      expect(calledFilters.limit).toBe(1);
      expect(calledFilters.offset).toBe(0);

      expect(result.page).toBe(1);
      expect(result.perPage).toBe(1);
    });

    it("perPageが上限100を超える場合は100に制限される", async () => {
      const mockRepository = createMockRepository();
      mockRepository.findByCounterpart.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const usecase = new GetCounterpartTransactionsUsecase(mockRepository);
      const result = await usecase.execute({
        counterpartId: "123",
        perPage: 500,
      });

      const calledFilters = mockRepository.findByCounterpart.mock
        .calls[0][0] as TransactionByCounterpartFilters;
      expect(calledFilters.limit).toBe(100);
      expect(result.perPage).toBe(100);
    });
  });

  describe("すべてのフィルタオプションの受け渡し", () => {
    it("すべてのオプションがリポジトリに正しく渡される", async () => {
      const mockRepository = createMockRepository();
      mockRepository.findByCounterpart.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const usecase = new GetCounterpartTransactionsUsecase(mockRepository);
      await usecase.execute({
        counterpartId: "456",
        politicalOrganizationId: "org-123",
        financialYear: 2023,
        page: 2,
        perPage: 25,
        sortField: "debitAmount",
        sortOrder: "desc",
      });

      const calledFilters = mockRepository.findByCounterpart.mock
        .calls[0][0] as TransactionByCounterpartFilters;
      expect(calledFilters).toEqual({
        counterpartId: "456",
        politicalOrganizationId: "org-123",
        financialYear: 2023,
        limit: 25,
        offset: 25,
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
      mockRepository.findByCounterpart.mockResolvedValue({
        transactions: [transactionWithCounterpart],
        total: 1,
      });

      const usecase = new GetCounterpartTransactionsUsecase(mockRepository);
      const result = await usecase.execute({
        counterpartId: "cp-1",
      });

      expect(result.transactions[0].counterpart).toEqual({
        id: "cp-1",
        name: "株式会社テスト",
        address: "東京都千代田区1-1-1",
      });
    });
  });
});
