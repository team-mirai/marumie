import "server-only";

import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { OrganizationData } from "@/types/organization";

/**
 * slug で指定した政治団体を1件だけ取得するユースケース
 *
 * 全団体を取得してメモリ上で絞り込むのではなく、
 * 対象の団体だけをリポジトリに問い合わせる。
 */
export class GetOrganizationBySlugUsecase {
  constructor(private politicalOrganizationRepository: IPoliticalOrganizationRepository) {}

  async execute(slug: string): Promise<OrganizationData | null> {
    try {
      const organization = await this.politicalOrganizationRepository.findBySlug(slug);

      if (!organization) {
        return null;
      }

      return {
        slug: organization.slug,
        orgName: organization.orgName,
        displayName: organization.displayName,
      };
    } catch (error) {
      throw new Error(
        `Failed to get organization by slug: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
