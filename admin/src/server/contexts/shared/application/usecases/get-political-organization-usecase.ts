import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class GetPoliticalOrganizationUsecase {
  constructor(private repository: IPoliticalOrganizationRepository) {}

  async execute(id: string): Promise<PoliticalOrganization> {
    try {
      const organizationId = parseInt(id, 10);

      if (Number.isNaN(organizationId)) {
        throw new Error("Invalid organization ID");
      }

      const organization = await this.repository.findById(BigInt(organizationId));

      if (!organization) {
        throw new Error("Organization not found");
      }

      return organization;
    } catch (error) {
      throw new Error(
        `Failed to get organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
