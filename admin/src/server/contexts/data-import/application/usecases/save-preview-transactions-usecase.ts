import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/server/domain/types/transaction";
import type { ITransactionRepository } from "@/server/repositories/interfaces/transaction-repository.interface";
import type { PreviewTransaction } from "@/server/contexts/data-import/domain/models/preview-transaction";
import { MfRecordConverter } from "@/server/contexts/data-import/infrastructure/mf/mf-record-converter";

export interface SavePreviewTransactionsInput {
  validTransactions: PreviewTransaction[];
  politicalOrganizationId: string;
}

export interface SavePreviewTransactionsResult {
  processedCount: number;
  savedCount: number;
  skippedCount: number;
  errors: string[];
}

export class SavePreviewTransactionsUsecase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private recordConverter: MfRecordConverter = new MfRecordConverter(),
  ) {}

  async execute(
    input: SavePreviewTransactionsInput,
  ): Promise<SavePreviewTransactionsResult> {
    const result: SavePreviewTransactionsResult = {
      processedCount: 0,
      savedCount: 0,
      skippedCount: 0,
      errors: [],
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
        (t) =>
          (t.status === "insert" || t.status === "update") &&
          t.transaction_type !== null,
      );

      result.processedCount = input.validTransactions.length;
      result.skippedCount = input.validTransactions.filter(
        (t) => t.status === "skip",
      ).length;

      // insertとupdateに分けて処理
      const insertTransactions = saveableTransactions.filter(
        (t) => t.status === "insert",
      );
      const updateTransactions = saveableTransactions.filter(
        (t) => t.status === "update",
      );

      let savedCount = 0;

      // bulk insert
      if (insertTransactions.length > 0) {
        const createInputs = insertTransactions.map((transaction) =>
          this.convertPreviewToCreateInput(
            transaction,
            input.politicalOrganizationId,
          ),
        );
        const createdTransactions =
          await this.transactionRepository.createMany(createInputs);
        savedCount += createdTransactions.length;
      }

      // bulk update
      if (updateTransactions.length > 0) {
        const updateData = updateTransactions.map((transaction) => ({
          where: {
            politicalOrganizationId: BigInt(input.politicalOrganizationId),
            transactionNo: transaction.transaction_no,
          },
          update: this.convertPreviewToUpdateInput(transaction),
        }));
        const updatedTransactions =
          await this.transactionRepository.updateMany(updateData);
        savedCount += updatedTransactions.length;
      }

      result.savedCount = savedCount;

      // Refresh webapp cache after successful save
      if (result.savedCount > 0) {
        await this.refreshWebappCache();
      }
    } catch (error) {
      console.error("Upload CSV error:", error);
      result.errors.push("データの保存中にエラーが発生しました");
    }

    return result;
  }

  private convertPreviewToCreateInput(
    previewTransaction: PreviewTransaction,
    politicalOrganizationId: string,
  ): CreateTransactionInput {
    // transaction_typeがnullの場合はエラー
    if (previewTransaction.transaction_type === null) {
      throw new Error(
        `Invalid transaction type: ${previewTransaction.transaction_type}`,
      );
    }

    return {
      political_organization_id: politicalOrganizationId,
      transaction_no: previewTransaction.transaction_no,
      transaction_date: previewTransaction.transaction_date,
      financial_year: this.recordConverter.extractFinancialYear(
        previewTransaction.transaction_date,
      ),
      transaction_type: previewTransaction.transaction_type,
      debit_account: previewTransaction.debit_account,
      debit_sub_account: previewTransaction.debit_sub_account || "",
      debit_department: "",
      debit_partner: "",
      debit_tax_category: "",
      debit_amount: previewTransaction.debit_amount,
      credit_account: previewTransaction.credit_account,
      credit_sub_account: previewTransaction.credit_sub_account || "",
      credit_department: "",
      credit_partner: "",
      credit_tax_category: "",
      credit_amount: previewTransaction.credit_amount,
      description: previewTransaction.description || "",
      label: previewTransaction.label || "",
      friendly_category: previewTransaction.friendly_category || "",
      memo: "",
      category_key: previewTransaction.category_key,
      hash: previewTransaction.hash,
    };
  }

  private convertPreviewToUpdateInput(
    previewTransaction: PreviewTransaction,
  ): UpdateTransactionInput {
    // transaction_typeがnullの場合はエラー
    if (previewTransaction.transaction_type === null) {
      throw new Error(
        `Invalid transaction type: ${previewTransaction.transaction_type}`,
      );
    }

    return {
      transaction_no: previewTransaction.transaction_no,
      transaction_date: previewTransaction.transaction_date,
      financial_year: this.recordConverter.extractFinancialYear(
        previewTransaction.transaction_date,
      ),
      transaction_type: previewTransaction.transaction_type,
      debit_account: previewTransaction.debit_account,
      debit_sub_account: previewTransaction.debit_sub_account || "",
      debit_department: "",
      debit_partner: "",
      debit_tax_category: "",
      debit_amount: previewTransaction.debit_amount,
      credit_account: previewTransaction.credit_account,
      credit_sub_account: previewTransaction.credit_sub_account || "",
      credit_department: "",
      credit_partner: "",
      credit_tax_category: "",
      credit_amount: previewTransaction.credit_amount,
      description: previewTransaction.description || "",
      label: previewTransaction.label || "",
      friendly_category: previewTransaction.friendly_category || "",
      memo: "",
      category_key: previewTransaction.category_key,
      hash: previewTransaction.hash,
    };
  }

  private async refreshWebappCache(): Promise<void> {
    try {
      const webappUrl = process.env.WEBAPP_URL || "http://localhost:3000";
      const refreshToken = process.env.DATA_REFRESH_TOKEN;

      if (refreshToken) {
        await fetch(`${webappUrl}/api/refresh`, {
          method: "POST",
          headers: {
            "x-refresh-token": refreshToken,
          },
        });
      }
    } catch (refreshError) {
      console.warn("Failed to refresh webapp cache:", refreshError);
      // Don't fail the usecase if cache refresh fails
    }
  }
}
