import "server-only";

import type { ITransactionWithCounterpartRepository } from "@/server/contexts/report/domain/repositories/report-transaction-repository.interface";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { ITransactionCounterpartRepository } from "@/server/contexts/report/domain/repositories/transaction-counterpart-repository.interface";

export interface BulkAssignCounterpartInput {
  tenantId: bigint;
  transactionIds: string[];
  counterpartId: string;
}

export interface BulkAssignCounterpartResult {
  success: boolean;
  successCount: number;
  failedIds: string[];
  errors?: string[];
}

export class BulkAssignCounterpartUsecase {
  constructor(
    private transactionRepository: ITransactionWithCounterpartRepository,
    private counterpartRepository: ICounterpartRepository,
    private transactionCounterpartRepository: ITransactionCounterpartRepository,
  ) {}

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

  async execute(input: BulkAssignCounterpartInput): Promise<BulkAssignCounterpartResult> {
    if (input.transactionIds.length === 0) {
      return {
        success: false,
        successCount: 0,
        failedIds: [],
        errors: ["トランザクションが選択されていません"],
      };
    }

    const counterpart = await this.counterpartRepository.findById(
      input.counterpartId,
      input.tenantId,
    );
    if (!counterpart) {
      return { success: false, successCount: 0, failedIds: [], errors: ["無効な取引先IDです"] };
    }

    const counterpartBigIntId = this.parseBigIntId(input.counterpartId);
    if (counterpartBigIntId === null) {
      return { success: false, successCount: 0, failedIds: [], errors: ["無効な取引先IDです"] };
    }

    const validTransactionIds: bigint[] = [];
    const failedIds: string[] = [];

    for (const transactionId of input.transactionIds) {
      const bigIntId = this.parseBigIntId(transactionId);
      if (bigIntId === null) {
        failedIds.push(transactionId);
        continue;
      }
      validTransactionIds.push(bigIntId);
    }

    if (validTransactionIds.length === 0) {
      return {
        success: false,
        successCount: 0,
        failedIds: input.transactionIds,
        errors: ["有効なトランザクションIDがありません"],
      };
    }

    const existingTransactionIds =
      await this.transactionRepository.findExistingIds(validTransactionIds);

    const existingTransactionIdSet = new Set(existingTransactionIds);
    const validExistingIds: bigint[] = [];

    for (const id of validTransactionIds) {
      if (existingTransactionIdSet.has(id)) {
        validExistingIds.push(id);
      } else {
        failedIds.push(id.toString());
      }
    }

    if (validExistingIds.length === 0) {
      return {
        success: false,
        successCount: 0,
        failedIds,
        errors: ["存在するトランザクションがありません"],
      };
    }

    await this.transactionCounterpartRepository.replaceMany(
      validExistingIds,
      validExistingIds.map((transactionId) => ({
        transactionId,
        counterpartId: counterpartBigIntId,
      })),
    );

    return {
      success: true,
      successCount: validExistingIds.length,
      failedIds,
    };
  }
}
