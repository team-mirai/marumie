import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class GetPoliticalOrganizationsUsecase {
  constructor(private repository: IPoliticalOrganizationRepository) {}

  async execute(): Promise<PoliticalOrganization[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      throw new Error(
        `Failed to get organizations: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
