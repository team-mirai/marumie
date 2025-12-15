import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

export class CreatePoliticalOrganizationUsecase {
  constructor(private repository: IPoliticalOrganizationRepository) {}

  async execute(
    displayName: string,
    slug: string,
    orgName?: string,
    description?: string,
  ): Promise<PoliticalOrganization> {
    try {
      if (!displayName || displayName.trim().length === 0) {
        throw new Error("Organization display name is required");
      }

      if (!slug || slug.trim().length === 0) {
        throw new Error("Organization slug is required");
      }

      return await this.repository.create(displayName, slug, orgName, description);
    } catch (error) {
      throw new Error(
        `Failed to create organization: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
