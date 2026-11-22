import "server-only";

import type { ITransactionRepository } from "@/server/contexts/shared/domain/repositories/transaction-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { MfJournal } from "@/server/contexts/data-import/domain/models/mf-journal";
import { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import { TransactionValidator } from "@/server/contexts/data-import/domain/services/transaction-validator";

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
    private validator: TransactionValidator = new TransactionValidator(),
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

      // ブラウザから戻った行の状態・取引種別・ハッシュは信じず、仕訳の内容と既存の取引から判定し直す
      const politicalOrganizationId = input.politicalOrganizationId;
      const rebuiltTransactions = input.validTransactions.map((t) =>
        MfJournal.fromReturnedPreview(t, politicalOrganizationId),
      );
      const existingTransactions = await this.transactionRepository.findByTransactionNos(
        rebuiltTransactions.map((t) => t.transaction_no),
        [politicalOrganizationId],
      );
      const judgedTransactions = this.validator.validatePreviewTransactions(
        rebuiltTransactions,
        existingTransactions,
      );
      const saveableTransactions = judgedTransactions.filter(PreviewTransaction.isSaveable);

      result.processedCount = input.validTransactions.length;
      result.skippedCount = judgedTransactions.filter((t) => t.status === "skip").length;

      // insertとupdateに分けて処理
      const insertTransactions = saveableTransactions.filter((t) => t.status === "insert");
      const updateTransactions = saveableTransactions.filter((t) => t.status === "update");

      let savedCount = 0;

      // bulk insert
      if (insertTransactions.length > 0) {
        const createInputs = insertTransactions.map((transaction) =>
          PreviewTransaction.toCreateInput(transaction, politicalOrganizationId),
        );
        const createdTransactions = await this.transactionRepository.createMany(createInputs);
        savedCount += createdTransactions.length;
      }

      // bulk update
      if (updateTransactions.length > 0) {
        const updateData = updateTransactions.map((transaction) => {
          const key = PreviewTransaction.existingTransactionKey(transaction);
          return {
            where: {
              politicalOrganizationId: BigInt(key.politicalOrganizationId),
              financialYear: key.financialYear,
              transactionNo: key.transactionNo,
            },
            update: PreviewTransaction.toUpdateInput(transaction),
          };
        });
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
