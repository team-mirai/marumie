import "server-only";

import type { IDonorRepository } from "@/server/contexts/report/domain/repositories/donor-repository.interface";

interface DeleteDonorResult {
  success: boolean;
  errors?: string[];
}

export class DeleteDonorUsecase {
  constructor(
    private repository: IDonorRepository,
    private checkUsage = true,
  ) {}

  async execute(id: string): Promise<DeleteDonorResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: ["寄付者が見つかりません"] };
    }

    if (this.checkUsage) {
      const usageCount = await this.repository.getUsageCount(id);
      if (usageCount > 0) {
        return {
          success: false,
          errors: [
            `この寄付者は${usageCount}件のトランザクションで使用されています。削除するには先に関連するトランザクションを削除してください。`,
          ],
        };
      }
    }

    await this.repository.delete(id);
    return { success: true };
  }
}
