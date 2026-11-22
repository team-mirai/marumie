import "server-only";

import { CounterpartDeletion } from "@/server/contexts/report/domain/models/counterpart";
import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

interface DeleteCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class DeleteCounterpartUsecase {
  constructor(private repository: ICounterpartRepository) {}

  async execute(id: string): Promise<DeleteCounterpartResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: ["取引先が見つかりません"] };
    }

    const usageCount = await this.repository.getUsageCount(id);
    const rejectionReason = CounterpartDeletion.rejectionReason(usageCount);
    if (rejectionReason) {
      return { success: false, errors: [rejectionReason] };
    }

    await this.repository.delete(id);
    return { success: true };
  }
}
