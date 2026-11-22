import "server-only";

import { donorDeletionRejectionReason } from "@/server/contexts/report/domain/models/donor";
import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";

interface DeleteDonorResult {
  success: boolean;
  errors?: string[];
}

export class DeleteDonorUsecase {
  constructor(private repository: IDonorRepository) {}

  async execute(id: string): Promise<DeleteDonorResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: ["寄付者が見つかりません"] };
    }

    const usageCount = await this.repository.getUsageCount(id);
    const rejectionReason = donorDeletionRejectionReason(usageCount);
    if (rejectionReason) {
      return { success: false, errors: [rejectionReason] };
    }

    await this.repository.delete(id);
    return { success: true };
  }
}
