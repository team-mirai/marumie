import "server-only";

import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class GetPoliticalOrganizationUsecase {
  constructor(private repository: IPoliticalOrganizationRepository) {}

  async execute(id: bigint): Promise<PoliticalOrganization> {
    try {
      const organization = await this.repository.findById(id);

      if (!organization) {
        throw new Error("政治団体が見つかりません");
      }

      return organization;
    } catch (error) {
      if (error instanceof Error && error.message === "政治団体が見つかりません") {
        throw error;
      }
      throw new Error(
        `Failed to get political organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
