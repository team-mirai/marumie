import { GetTransactionsUsecase } from "@/server/contexts/data-import/application/usecases/get-transactions-usecase";
import type {
  ITransactionRepository,
  PaginatedResult,
} from "@/server/contexts/shared/domain/repositories/transaction-repository.interface";
import type { TransactionWithOrganization } from "@/server/contexts/shared/domain/transaction";

describe("GetTransactionsUsecase", () => {
  let mockRepository: jest.Mocked<ITransactionRepository>;
  let usecase: GetTransactionsUsecase;

  const createMockTransaction = (overrides: Partial<TransactionWithOrganization> = {}): TransactionWithOrganization => ({
    id: "1",
    political_organization_id: "org-1",
    transaction_no: "TX-001",
    transaction_date: new Date("2024-04-01"),
    financial_year: 2024,
    transaction_type: "expense",
    debit_account: "事務所費",
    credit_account: "現金",
    debit_amount: 100000,
    credit_amount: 100000,
    debit_partner: "テスト会社",
    credit_partner: undefined,
    debit_tax_category: undefined,
    credit_tax_category: undefined,
    description: "テスト取引",
    memo: undefined,
    category_key: "事務所費",
    friendly_category: "事務所費",
    label: "",
    hash: "test-hash",
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    ...overrides,
  });

  const createMockPaginatedResult = (
    items: TransactionWithOrganization[],
    total: number,
    page = 1,
    perPage = 50,
  ): PaginatedResult<TransactionWithOrganization> => ({
    items,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });

  beforeEach(() => {
    mockRepository = {
      findWithPagination: jest.fn(),
      updateMany: jest.fn(),
      deleteAll: jest.fn(),
      createMany: jest.fn(),
      findByTransactionNos: jest.fn(),
    };
    usecase = new GetTransactionsUsecase(mockRepository);
  });

  describe("ページネーション", () => {
    it("デフォルトのページネーションを適用する", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0),
      );

      const result = await usecase.execute({});

      expect(result.page).toBe(1);
      expect(result.perPage).toBe(50);
      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(
        {},
        { page: 1, perPage: 50 },
      );
    });

    it("指定されたページネーションを適用する", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 100, 3, 20),
      );

      const result = await usecase.execute({ page: 3, perPage: 20 });

      expect(result.page).toBe(3);
      expect(result.perPage).toBe(20);
      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(
        {},
        { page: 3, perPage: 20 },
      );
    });

    it("ページ番号が0以下の場合は1に補正する", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0),
      );

      const result = await usecase.execute({ page: 0 });

      expect(result.page).toBe(1);
    });

    it("perPageが100を超える場合は100に制限する", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0, 1, 100),
      );

      const result = await usecase.execute({ perPage: 200 });

      expect(result.perPage).toBe(100);
    });

    it("perPageが0以下の場合は1に補正する", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0, 1, 1),
      );

      const result = await usecase.execute({ perPage: 0 });

      expect(result.perPage).toBe(1);
    });
  });

  describe("フィルター", () => {
    it("政治組織IDでフィルタリングする", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0),
      );

      await usecase.execute({ politicalOrganizationIds: ["org-1", "org-2"] });

      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          political_organization_ids: ["org-1", "org-2"],
        }),
        expect.any(Object),
      );
    });

    it("取引タイプでフィルタリングする", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0),
      );

      await usecase.execute({ transactionType: "income" });

      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: "income",
        }),
        expect.any(Object),
      );
    });

    it("日付範囲でフィルタリングする", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0),
      );

      const dateFrom = new Date("2024-01-01");
      const dateTo = new Date("2024-12-31");
      await usecase.execute({ dateFrom, dateTo });

      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          date_from: dateFrom,
          date_to: dateTo,
        }),
        expect.any(Object),
      );
    });

    it("年度でフィルタリングする", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0),
      );

      await usecase.execute({ financialYear: 2024 });

      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          financial_year: 2024,
        }),
        expect.any(Object),
      );
    });

    it("空の政治組織IDリストはフィルターに含めない", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 0),
      );

      await usecase.execute({ politicalOrganizationIds: [] });

      expect(mockRepository.findWithPagination).toHaveBeenCalledWith(
        {},
        expect.any(Object),
      );
    });
  });

  describe("結果の返却", () => {
    it("取引一覧と合計件数を返す", async () => {
      const transactions = [
        createMockTransaction({ id: "1" }),
        createMockTransaction({ id: "2" }),
      ];
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult(transactions, 50, 1, 50),
      );

      const result = await usecase.execute({});

      expect(result.transactions).toEqual(transactions);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(1);
    });

    it("totalPagesを正しく計算する", async () => {
      mockRepository.findWithPagination.mockResolvedValue(
        createMockPaginatedResult([], 100, 1, 20),
      );

      const result = await usecase.execute({ perPage: 20 });

      expect(result.totalPages).toBe(5);
    });
  });

  describe("エラーハンドリング", () => {
    it("リポジトリがエラーを投げた場合は例外を伝播する", async () => {
      mockRepository.findWithPagination.mockRejectedValue(new Error("Database error"));

      await expect(usecase.execute({})).rejects.toThrow("Failed to get transactions: Database error");
    });

    it("不明なエラーの場合はUnknown errorメッセージを返す", async () => {
      mockRepository.findWithPagination.mockRejectedValue("unknown");

      await expect(usecase.execute({})).rejects.toThrow("Failed to get transactions: Unknown error");
    });
  });
});
