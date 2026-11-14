import "server-only";

import type { IPoliticalOrganizationRepository } from "@/server/contexts/public-finance/domain/repositories/political-organization-repository.interface";
import type { IProfilePhotoStorage } from "@/server/contexts/public-finance/domain/repositories/profile-photo-storage.interface";

/** 署名URLの有効期限（秒）。写真の URL を開いてすぐ表示する用途なので短くする */
const SIGNED_URL_EXPIRES_IN = 300;

export class GetOrganizationPhotoUrlUsecase {
  constructor(
    private politicalOrganizationRepository: IPoliticalOrganizationRepository,
    private storage: IProfilePhotoStorage,
  ) {}

  /** 政治団体の代表者の顔写真の署名URL。団体が無い・写真が未登録なら null */
  async execute(slug: string): Promise<string | null> {
    const organization = await this.politicalOrganizationRepository.findBySlug(slug);
    if (!organization?.photoPath) return null;
    return await this.storage.createSignedUrl(organization.photoPath, SIGNED_URL_EXPIRES_IN);
  }
}
