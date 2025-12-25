import "server-only";

import type { ICounterpartAssignmentTransactionRepository } from "@/server/contexts/report/domain/repositories/counterpart-assignment-transaction-repository.interface";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";
import type { ITransactionCounterpartRepository } from "@/server/contexts/report/domain/repositories/transaction-counterpart-repository.interface";

export interface AssignCounterpartInput {
  transactionId: string;
  counterpartId: string;
}

export interface AssignCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class AssignCounterpartUsecase {
  constructor(
    private transactionRepository: ICounterpartAssignmentTransactionRepository,
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

  async execute(input: AssignCounterpartInput): Promise<AssignCounterpartResult> {
    const transactionBigIntId = this.parseBigIntId(input.transactionId);
    if (transactionBigIntId === null) {
      return { success: false, errors: ["無効なトランザクションIDです"] };
    }

    const counterpart = await this.counterpartRepository.findById(input.counterpartId);
    if (!counterpart) {
      return { success: false, errors: ["無効な取引先IDです"] };
    }

    const transactionExists = await this.transactionRepository.existsById(transactionBigIntId);
    if (!transactionExists) {
      return { success: false, errors: ["トランザクションが見つかりません"] };
    }

    const counterpartBigIntId = this.parseBigIntId(input.counterpartId);
    if (counterpartBigIntId === null) {
      return { success: false, errors: ["無効な取引先IDです"] };
    }

    await this.transactionCounterpartRepository.upsert(transactionBigIntId, counterpartBigIntId);

    return { success: true };
  }
}

export interface UnassignCounterpartInput {
  transactionId: string;
}

export interface UnassignCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class UnassignCounterpartUsecase {
  constructor(private transactionCounterpartRepository: ITransactionCounterpartRepository) {}

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

  async execute(input: UnassignCounterpartInput): Promise<UnassignCounterpartResult> {
    const transactionBigIntId = this.parseBigIntId(input.transactionId);
    if (transactionBigIntId === null) {
      return { success: false, errors: ["無効なトランザクションIDです"] };
    }

    const existing =
      await this.transactionCounterpartRepository.findByTransactionId(transactionBigIntId);

    if (!existing) {
      return { success: true };
    }

    await this.transactionCounterpartRepository.deleteByTransactionId(transactionBigIntId);

    return { success: true };
  }
}
