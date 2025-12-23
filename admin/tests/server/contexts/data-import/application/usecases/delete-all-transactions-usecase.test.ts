import { DeleteAllTransactionsUsecase } from "@/server/contexts/data-import/application/usecases/delete-all-transactions-usecase";
import type { ITransactionRepository } from "@/server/contexts/shared/domain/repositories/transaction-repository.interface";

describe("DeleteAllTransactionsUsecase", () => {
  let mockRepository: jest.Mocked<ITransactionRepository>;
  let usecase: DeleteAllTransactionsUsecase;

  beforeEach(() => {
    mockRepository = {
      findWithPagination: jest.fn(),
      updateMany: jest.fn(),
      deleteAll: jest.fn(),
      createMany: jest.fn(),
      findByTransactionNos: jest.fn(),
    };
    usecase = new DeleteAllTransactionsUsecase(mockRepository);
  });

  describe("全取引削除", () => {
    it("組織IDなしで全取引を削除する", async () => {
      mockRepository.deleteAll.mockResolvedValue(100);

      const result = await usecase.execute();

      expect(result.deletedCount).toBe(100);
      expect(mockRepository.deleteAll).toHaveBeenCalledWith(undefined);
    });

    it("組織IDを指定して取引を削除する", async () => {
      mockRepository.deleteAll.mockResolvedValue(50);

      const result = await usecase.execute("org-123");

      expect(result.deletedCount).toBe(50);
      expect(mockRepository.deleteAll).toHaveBeenCalledWith({
        political_organization_ids: ["org-123"],
      });
    });

    it("削除対象がない場合は0を返す", async () => {
      mockRepository.deleteAll.mockResolvedValue(0);

      const result = await usecase.execute("org-empty");

      expect(result.deletedCount).toBe(0);
    });
  });

  describe("エラーハンドリング", () => {
    it("リポジトリがエラーを投げた場合は例外を伝播する", async () => {
      mockRepository.deleteAll.mockRejectedValue(new Error("Database error"));

      await expect(usecase.execute()).rejects.toThrow("Failed to delete transactions: Database error");
    });

    it("不明なエラーの場合はUnknown errorメッセージを返す", async () => {
      mockRepository.deleteAll.mockRejectedValue("unknown");

      await expect(usecase.execute()).rejects.toThrow("Failed to delete transactions: Unknown error");
    });
  });
});
