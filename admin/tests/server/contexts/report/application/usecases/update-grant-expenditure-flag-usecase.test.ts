import { UpdateGrantExpenditureFlagUsecase } from "@/server/contexts/report/application/usecases/update-grant-expenditure-flag-usecase";
import type { ITransactionWithCounterpartRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type { TransactionWithCounterpart } from "@/server/contexts/report/domain/models/transaction-with-counterpart";

describe("UpdateGrantExpenditureFlagUsecase", () => {
  let mockRepository: jest.Mocked<ITransactionWithCounterpartRepository>;

  const createMockTransaction = (
    overrides: Partial<TransactionWithCounterpart> = {},
  ): TransactionWithCounterpart => ({
    id: "1",
    transactionNo: "TXN-001",
    transactionDate: new Date("2024-01-15"),
    financialYear: 2024,
    transactionType: "expense",
    categoryKey: "expense_office_expenses",
    friendlyCategory: null,
    label: "テスト取引",
    description: "テスト摘要",
    memo: null,
    debitAmount: 100000,
    creditAmount: 0,
    debitPartner: null,
    creditPartner: null,
    counterpart: null,
    requiresCounterpart: true,
    isGrantExpenditure: false,
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      findTransactionsWithCounterparts: jest.fn(),
      findByCounterpart: jest.fn(),
      existsById: jest.fn(),
      findExistingIds: jest.fn(),
      findByIdWithCounterpart: jest.fn(),
      updateGrantExpenditureFlag: jest.fn(),
    };
  });

  describe("execute", () => {
    describe("正常系", () => {
      it("支出取引の交付金フラグをtrueに更新できる", async () => {
        const transaction = createMockTransaction({ isGrantExpenditure: false });
        mockRepository.findByIdWithCounterpart.mockResolvedValue(transaction);
        mockRepository.updateGrantExpenditureFlag.mockResolvedValue();

        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "1",
          isGrantExpenditure: true,
        });

        expect(result.success).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(mockRepository.updateGrantExpenditureFlag).toHaveBeenCalledWith(
          BigInt(1),
          true,
        );
      });

      it("支出取引の交付金フラグをfalseに更新できる", async () => {
        const transaction = createMockTransaction({ isGrantExpenditure: true });
        mockRepository.findByIdWithCounterpart.mockResolvedValue(transaction);
        mockRepository.updateGrantExpenditureFlag.mockResolvedValue();

        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "1",
          isGrantExpenditure: false,
        });

        expect(result.success).toBe(true);
        expect(result.errors).toBeUndefined();
        expect(mockRepository.updateGrantExpenditureFlag).toHaveBeenCalledWith(
          BigInt(1),
          false,
        );
      });

      it("大きなトランザクションIDでも正しく処理できる", async () => {
        const transaction = createMockTransaction({ id: "9007199254740991" });
        mockRepository.findByIdWithCounterpart.mockResolvedValue(transaction);
        mockRepository.updateGrantExpenditureFlag.mockResolvedValue();

        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "9007199254740991",
          isGrantExpenditure: true,
        });

        expect(result.success).toBe(true);
        expect(mockRepository.updateGrantExpenditureFlag).toHaveBeenCalledWith(
          BigInt("9007199254740991"),
          true,
        );
      });
    });

    describe("異常系 - トランザクションID", () => {
      it("無効なトランザクションID（文字列）でエラーを返す", async () => {
        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "invalid-id",
          isGrantExpenditure: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain("無効なトランザクションIDです");
        expect(mockRepository.findByIdWithCounterpart).not.toHaveBeenCalled();
      });

      it("無効なトランザクションID（空文字）でエラーを返す", async () => {
        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "",
          isGrantExpenditure: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain("無効なトランザクションIDです");
      });

      it("無効なトランザクションID（負の数）でエラーを返す", async () => {
        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "-1",
          isGrantExpenditure: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain("無効なトランザクションIDです");
      });

      it("無効なトランザクションID（小数）でエラーを返す", async () => {
        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "1.5",
          isGrantExpenditure: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain("無効なトランザクションIDです");
      });
    });

    describe("異常系 - トランザクション存在確認", () => {
      it("存在しないトランザクションでエラーを返す", async () => {
        mockRepository.findByIdWithCounterpart.mockResolvedValue(null);

        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "999",
          isGrantExpenditure: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain("トランザクションが見つかりません");
        expect(mockRepository.updateGrantExpenditureFlag).not.toHaveBeenCalled();
      });
    });

    describe("異常系 - トランザクションタイプ", () => {
      it("収入取引に対する更新でエラーを返す", async () => {
        const incomeTransaction = createMockTransaction({
          transactionType: "income",
        });
        mockRepository.findByIdWithCounterpart.mockResolvedValue(incomeTransaction);

        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        const result = await usecase.execute({
          transactionId: "1",
          isGrantExpenditure: true,
        });

        expect(result.success).toBe(false);
        expect(result.errors).toContain("交付金フラグは支出取引のみに設定できます");
        expect(mockRepository.updateGrantExpenditureFlag).not.toHaveBeenCalled();
      });
    });

    describe("リポジトリ呼び出し", () => {
      it("findByIdWithCounterpartが正しいIDで呼び出される", async () => {
        const transaction = createMockTransaction();
        mockRepository.findByIdWithCounterpart.mockResolvedValue(transaction);
        mockRepository.updateGrantExpenditureFlag.mockResolvedValue();

        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        await usecase.execute({
          transactionId: "123",
          isGrantExpenditure: true,
        });

        expect(mockRepository.findByIdWithCounterpart).toHaveBeenCalledWith(BigInt(123));
      });

      it("updateGrantExpenditureFlagが正しい引数で呼び出される", async () => {
        const transaction = createMockTransaction();
        mockRepository.findByIdWithCounterpart.mockResolvedValue(transaction);
        mockRepository.updateGrantExpenditureFlag.mockResolvedValue();

        const usecase = new UpdateGrantExpenditureFlagUsecase(mockRepository);
        await usecase.execute({
          transactionId: "456",
          isGrantExpenditure: true,
        });

        expect(mockRepository.updateGrantExpenditureFlag).toHaveBeenCalledWith(
          BigInt(456),
          true,
        );
      });
    });
  });
});
