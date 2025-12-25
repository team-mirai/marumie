import "server-only";

import type { ITransactionCounterpartRepository } from "@/server/contexts/report/domain/repositories/transaction-counterpart-repository.interface";

export interface BulkUnassignCounterpartInput {
  transactionIds: string[];
}

export interface BulkUnassignCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class BulkUnassignCounterpartUsecase {
  constructor(private transactionCounterpartRepository: ITransactionCounterpartRepository) {}

  async execute(input: BulkUnassignCounterpartInput): Promise<BulkUnassignCounterpartResult> {
    try {
      if (input.transactionIds.length === 0) {
        return {
          success: false,
          errors: ["取引が選択されていません"],
        };
      }

      const transactionBigIntIds = input.transactionIds.map((id) => {
        if (!/^\d+$/.test(id)) {
          throw new Error(`無効な取引ID: ${id}`);
        }
        return BigInt(id);
      });

      await this.transactionCounterpartRepository.deleteByTransactionIds(transactionBigIntIds);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "一括紐付け解除に失敗しました"],
      };
    }
  }
}
