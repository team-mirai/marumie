import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type {
  IPoliticalOrganizationRepository,
  UpdatePoliticalOrganizationData,
} from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class UpdatePoliticalOrganizationUsecase {
  constructor(private repository: IPoliticalOrganizationRepository) {}

  async execute(id: string, data: UpdatePoliticalOrganizationData): Promise<PoliticalOrganization> {
    try {
      const organizationId = parseInt(id, 10);

      if (Number.isNaN(organizationId)) {
        throw new Error("Invalid organization ID");
      }

      if (!data.displayName || data.displayName.trim().length === 0) {
        throw new Error("Organization display name is required");
      }

      if (!data.slug || data.slug.trim().length === 0) {
        throw new Error("Organization slug is required");
      }

      return await this.repository.update(BigInt(organizationId), data);
    } catch (error) {
      throw new Error(
        `Failed to update organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
