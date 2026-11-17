import "server-only";
import { Politician } from "@/shared/models/politician";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import { invalidateWebappCache } from "@/server/contexts/shared/application/services/invalidate-webapp-cache";

/**
 * 議員の顔写真を外す。先に議員の参照を外してから Storage の写真を消すので、
 * 写真の削除に失敗しても公開側に消えた写真を指す参照は残らない。参照を外したら webapp のキャッシュを消す。
 */
export class DeletePoliticianPhotoUsecase {
  constructor(
    private repository: IPoliticianRepository,
    private storage: IPoliticianPhotoStorage,
    private cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(id: string) {
    const politician = Politician.isValidId(id) ? await this.repository.findById(id) : null;
    if (!politician) throw new Error("議員が見つかりません");
    if (!politician.photoPath) return { cacheWarning: null };
    await this.repository.setPhotoPath(id, null);
    try {
      await this.storage.remove(politician.photoPath);
    } catch (error) {
      console.error("Politician photo cleanup error:", error);
    }
    return { cacheWarning: await invalidateWebappCache(this.cacheInvalidator) };
  }
}
