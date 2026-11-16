import "server-only";

import { OrganizationKind } from "@/server/contexts/public-finance/domain/models/organization-kind";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { PoliticalOrganization } from "@/shared/models/political-organization";
import type { OrganizationsResponse, OrganizationData } from "@/types/organization";

interface GetOrganizationsParams {
  /** 顔写真のストレージが使える環境か */
  photoStorageAvailable: boolean;
}

export class GetOrganizationsUsecase {
  constructor(private politicalOrganizationRepository: IPoliticalOrganizationRepository) {}

  async execute(params: GetOrganizationsParams): Promise<OrganizationsResponse> {
    try {
      const organizations = await this.politicalOrganizationRepository.findAll();

      // 0件の場合は空のレスポンスを返す（CIビルド時など）
      if (organizations.length === 0) {
        return {
          default: null,
          organizations: [],
        };
      }

      const typeCodesById = await this.politicalOrganizationRepository.findTypeCodesByIds(
        organizations.map((org) => org.id),
      );

      const organizationData: OrganizationData[] = organizations.map(
        (org: PoliticalOrganization) => ({
          slug: org.slug,
          orgName: org.orgName,
          displayName: org.displayName,
          kind: OrganizationKind.fromTypeCodes(typeCodesById.get(org.id) ?? []),
          hasPhoto: params.photoStorageAvailable && org.photoPath !== null,
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
