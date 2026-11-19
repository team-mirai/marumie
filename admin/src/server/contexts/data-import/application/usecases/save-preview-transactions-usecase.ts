import "server-only";

import type { ITransactionRepository } from "@/server/contexts/shared/domain/repositories/transaction-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";

export interface SavePreviewTransactionsInput {
  validTransactions: PreviewTransaction[];
  politicalOrganizationId: string;
}

interface SavePreviewTransactionsResult {
  processedCount: number;
  savedCount: number;
  skippedCount: number;
  errors: string[];
  /** 保存はできたが webapp のキャッシュを無効化できなかったときの理由。保存の失敗とは分けて伝える */
  cacheWarning: string | null;
}

export class SavePreviewTransactionsUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(input: SavePreviewTransactionsInput): Promise<SavePreviewTransactionsResult> {
    const result: SavePreviewTransactionsResult = {
      processedCount: 0,
      savedCount: 0,
      skippedCount: 0,
      errors: [],
      cacheWarning: null,
    };

    try {
      // Basic validation
      if (!input.validTransactions || input.validTransactions.length === 0) {
        result.errors.push("有効なトランザクションがありません");
        return result;
      }

      if (!input.politicalOrganizationId) {
        result.errors.push("政治組織IDが指定されていません");
        return result;
      }

      const saveableTransactions = input.validTransactions.filter(
        (t) => (t.status === "insert" || t.status === "update") && t.transaction_type !== null,
      );

      result.processedCount = input.validTransactions.length;
      result.skippedCount = input.validTransactions.filter((t) => t.status === "skip").length;

      // insertとupdateに分けて処理
      const insertTransactions = saveableTransactions.filter((t) => t.status === "insert");
      const updateTransactions = saveableTransactions.filter((t) => t.status === "update");

      let savedCount = 0;

      // bulk insert
      if (insertTransactions.length > 0) {
        const createInputs = insertTransactions.map((transaction) =>
          PreviewTransaction.toCreateInput(transaction, input.politicalOrganizationId),
        );
        const createdTransactions = await this.transactionRepository.createMany(createInputs);
        savedCount += createdTransactions.length;
      }

      // bulk update
      if (updateTransactions.length > 0) {
        const updateData = updateTransactions.map((transaction) => ({
          where: {
            politicalOrganizationId: BigInt(input.politicalOrganizationId),
            financialYear: PreviewTransaction.extractFinancialYear(transaction.transaction_date),
            transactionNo: transaction.transaction_no,
          },
          update: PreviewTransaction.toUpdateInput(transaction),
        }));
        const updatedTransactions = await this.transactionRepository.updateMany(updateData);
        savedCount += updatedTransactions.length;
      }

      result.savedCount = savedCount;
    } catch (error) {
      console.error("Upload CSV error:", error);
      result.errors.push("データの保存中にエラーが発生しました");
      return result;
    }

    // 保存成功時に webapp のキャッシュを無効化する。
    // 保存自体は確定しているので、無効化の失敗は保存エラーにせず警告として返す。
    if (result.savedCount > 0) {
      try {
        await this.cacheInvalidator.invalidateWebappCache();
      } catch (error) {
        console.error("Webapp cache invalidation error:", error);
        result.cacheWarning =
          error instanceof Error ? error.message : "ウェブアプリのキャッシュを更新できませんでした";
      }
    }

    return result;
  }
}
