import "server-only";

import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { OrganizationsResponse, OrganizationData } from "@/types/organization";

export class GetOrganizationsUsecase {
  constructor(private politicalOrganizationRepository: IPoliticalOrganizationRepository) {}

  async execute(): Promise<OrganizationsResponse> {
    try {
      const organizations = await this.politicalOrganizationRepository.findAll();

      // 0件の場合は空のレスポンスを返す（CIビルド時など）
      if (organizations.length === 0) {
        return {
          default: null,
          organizations: [],
        };
      }

      const organizationData: OrganizationData[] = organizations.map(
        (org: PoliticalOrganization) => ({
          slug: org.slug,
          orgName: org.orgName,
          displayName: org.displayName,
        }),
      );

      return {
        default: organizationData[0].slug,
        organizations: organizationData,
      };
    } catch (error) {
      throw new Error(
        `Failed to get organizations: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
