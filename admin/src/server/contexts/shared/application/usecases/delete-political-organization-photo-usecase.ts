import "server-only";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { invalidateWebappCache } from "@/server/contexts/shared/application/services/invalidate-webapp-cache";

/**
 * 政治団体の代表者の顔写真を外す。先に政治団体の参照を外してから Storage の写真を消すので、
 * 写真の削除に失敗しても公開側に消えた写真を指す参照は残らない。
 * 参照を外したら webapp のキャッシュを消す（失敗は警告として返す）。
 */
export class DeletePoliticalOrganizationPhotoUsecase {
  constructor(
    private repository: IPoliticalOrganizationRepository,
    private storage: IPoliticianPhotoStorage,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(id: string) {
    const organization = /^[1-9]\d*$/.test(id) ? await this.repository.findById(BigInt(id)) : null;
    if (!organization) throw new Error("政治団体が見つかりません");
    if (!organization.photoPath) return { cacheWarning: null };
    await this.repository.setPhotoPath(BigInt(id), null);
    try {
      await this.storage.remove(organization.photoPath);
    } catch (error) {
      console.error("Political organization photo cleanup error:", error);
    }
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
