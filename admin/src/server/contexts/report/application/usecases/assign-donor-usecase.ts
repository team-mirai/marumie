import "server-only";

import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";
import type { ITransactionDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-donor-repository.interface";
import type { ITransactionWithDonorRepository } from "@/server/contexts/report/domain/repositories/transaction-with-donor-repository.interface";
import { isDonorTypeAllowedForCategory } from "@/server/contexts/report/domain/models/donor-assignment-rules";

export interface BulkAssignDonorInput {
  transactionIds: string[];
  donorId: string;
}

export interface BulkAssignDonorResult {
  success: boolean;
  assignedCount?: number;
  errors?: string[];
}

export class BulkAssignDonorUsecase {
  constructor(
    private transactionRepository: ITransactionWithDonorRepository,
    private donorRepository: IDonorRepository,
    private transactionDonorRepository: ITransactionDonorRepository,
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

  async execute(input: BulkAssignDonorInput): Promise<BulkAssignDonorResult> {
    if (input.transactionIds.length === 0) {
      return { success: false, errors: ["トランザクションが選択されていません"] };
    }

    const donorBigIntId = this.parseBigIntId(input.donorId);
    if (donorBigIntId === null) {
      return { success: false, errors: ["無効な寄付者IDです"] };
    }

    const donor = await this.donorRepository.findById(input.donorId);
    if (!donor) {
      return { success: false, errors: ["寄付者が見つかりません"] };
    }

    const transactionBigIntIds: bigint[] = [];
    for (const id of input.transactionIds) {
      const bigIntId = this.parseBigIntId(id);
      if (bigIntId === null) {
        return { success: false, errors: [`無効なトランザクションID: ${id}`] };
      }
      transactionBigIntIds.push(bigIntId);
    }

    const transactions = await this.transactionRepository.findByIdsWithDonor(transactionBigIntIds);
    if (transactions.length !== input.transactionIds.length) {
      const foundIds = new Set(transactions.map((t) => t.id));
      const missingIds = input.transactionIds.filter((id) => !foundIds.has(id));
      return {
        success: false,
        errors: [`以下のトランザクションが見つかりません: ${missingIds.join(", ")}`],
      };
    }

    const incompatibleTransactions = transactions.filter(
      (t) => !isDonorTypeAllowedForCategory(t.categoryKey, donor.donorType),
    );
    if (incompatibleTransactions.length > 0) {
      const categoryKeys = [...new Set(incompatibleTransactions.map((t) => t.categoryKey))];
      return {
        success: false,
        errors: [
          `選択された寄付者の種別（${donor.donorType}）は、以下のカテゴリで許可されていません: ${categoryKeys.join(", ")}`,
        ],
      };
    }

    const data = transactionBigIntIds.map((transactionId) => ({
      transactionId,
      donorId: donorBigIntId,
    }));

    await this.transactionDonorRepository.replaceMany(transactionBigIntIds, data);

    return { success: true, assignedCount: transactionBigIntIds.length };
  }
}
