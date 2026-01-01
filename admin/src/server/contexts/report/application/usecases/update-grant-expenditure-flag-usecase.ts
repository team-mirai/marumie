import "server-only";

import type { ITransactionWithCounterpartRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import { validateGrantExpenditureFlagUpdate } from "@/server/contexts/report/domain/models/grant-expenditure-rules";

export interface UpdateGrantExpenditureFlagInput {
  transactionId: string;
  isGrantExpenditure: boolean;
}

export interface UpdateGrantExpenditureFlagResult {
  success: boolean;
  errors?: string[];
}

export class UpdateGrantExpenditureFlagUsecase {
  constructor(private transactionRepository: ITransactionWithCounterpartRepository) {}

  private parseBigIntId(id: string): bigint | null {
    if (!/^\d+$/.test(id)) {
      return null;
    }
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  async execute(input: UpdateGrantExpenditureFlagInput): Promise<UpdateGrantExpenditureFlagResult> {
    const transactionBigIntId = this.parseBigIntId(input.transactionId);
    if (transactionBigIntId === null) {
      return { success: false, errors: ["無効なトランザクションIDです"] };
    }

    const transaction =
      await this.transactionRepository.findByIdWithCounterpart(transactionBigIntId);
    if (!transaction) {
      return { success: false, errors: ["トランザクションが見つかりません"] };
    }

    const validationResult = validateGrantExpenditureFlagUpdate(transaction.transactionType);
    if (!validationResult.isValid) {
      return { success: false, errors: [validationResult.errorMessage ?? "バリデーションエラー"] };
    }

    await this.transactionRepository.updateGrantExpenditureFlag(
      transactionBigIntId,
      input.isGrantExpenditure,
    );

    return { success: true };
  }
}
