import "server-only";

import type { IOrganizationPhotoStorage } from "@/server/contexts/public-finance/domain/repositories/organization-photo-storage.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";

/** 署名URLの有効期限（秒）。配信のたびにリダイレクトで作り直すので短くする */
const SIGNED_URL_EXPIRES_IN = 60;

/** 政治団体の代表者の顔写真の署名URLを返す。団体が無いか、写真が未登録なら null */
export class GetOrganizationPhotoUrlUsecase {
  constructor(
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
    private storage: IOrganizationPhotoStorage,
  ) {}

  async execute(slug: string): Promise<string | null> {
    const organization = await this.politicalOrganizationRepository.findBySlug(slug);
    if (!organization?.photoPath) return null;
    return await this.storage.createSignedUrl(organization.photoPath, SIGNED_URL_EXPIRES_IN);
  }
}
