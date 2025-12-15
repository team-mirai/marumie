import "server-only";

import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

interface DeletePoliticalOrganizationResult {
  success: boolean;
  message: string;
}

export class DeletePoliticalOrganizationUsecase {
  constructor(private politicalOrganizationRepository: IPoliticalOrganizationRepository) {}

  async execute(orgId: bigint): Promise<DeletePoliticalOrganizationResult> {
    try {
      const transactionCount = await this.politicalOrganizationRepository.countTransactions(orgId);

      if (transactionCount > 0) {
        return {
          success: false,
          message: `この政治団体には${transactionCount}件の取引が紐づいているため削除できません。`,
        };
      }

      await this.politicalOrganizationRepository.delete(orgId);

      return {
        success: true,
        message: "政治団体を削除しました。",
      };
    } catch (error) {
      console.error("Error deleting political organization:", error);
      return {
        success: false,
        message: "削除中にエラーが発生しました。",
      };
    }
  }
}
