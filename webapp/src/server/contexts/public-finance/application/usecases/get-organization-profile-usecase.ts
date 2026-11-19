import "server-only";

import { OrganizationProfile } from "@/server/contexts/public-finance/domain/models/organization-profile";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

export class GetOrganizationProfileUsecase {
  constructor(private politicalOrganizationRepository: IPoliticalOrganizationRepository) {}

  /** 政治団体ページの見出しカードに出すプロフィール。存在しない団体は null */
  async execute(slug: string): Promise<OrganizationProfile | null> {
    const organization = await this.politicalOrganizationRepository.findBySlug(slug);
    if (!organization) return null;
    return {
      websiteUrl: organization.websiteUrl,
      snsUrls: organization.snsUrls,
      photoVersion: OrganizationProfile.photoVersion(organization.photoPath),
    };
  }
}
