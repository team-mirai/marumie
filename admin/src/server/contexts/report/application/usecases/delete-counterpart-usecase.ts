import "server-only";

import type { ICounterpartRepository } from "@/server/contexts/report/domain/repositories/counterpart-repository.interface";

interface DeleteCounterpartResult {
  success: boolean;
  errors?: string[];
}

export class DeleteCounterpartUsecase {
  constructor(
    private repository: ICounterpartRepository,
    private checkUsage = true,
  ) {}

  async execute(id: string): Promise<DeleteCounterpartResult> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { success: false, errors: ["取引先が見つかりません"] };
    }

    if (this.checkUsage) {
      const usageCount = await this.repository.getUsageCount(id);
      if (usageCount > 0) {
        return {
          success: false,
          errors: [
            `この取引先は${usageCount}件のトランザクションで使用されています。削除するには先に関連するトランザクションを削除してください。`,
          ],
        };
      }
    }

    await this.repository.delete(id);
    return { success: true };
  }
}
