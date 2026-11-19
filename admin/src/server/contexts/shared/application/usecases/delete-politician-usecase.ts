import "server-only";
import { Politician } from "@/shared/models/politician";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

/**
 * 議員を削除し、顔写真があれば Storage からも消す。
 * 写真の削除は議員の削除が済んでから best effort で行うので、失敗しても議員の削除は取り消さない。
 * Storage は写真があるときだけ組み立てるので、Storage が未設定の環境でも写真の無い議員は削除できる。
 */
export class DeletePoliticianUsecase {
  constructor(
    private repository: IPoliticianRepository,
    private storage: () => IPoliticianPhotoStorage,
  ) {}

  async execute(id: string) {
    const politician = Politician.isValidId(id) ? await this.repository.findById(id) : null;
    if (!politician) throw new Error("議員が見つかりません");
    await this.repository.delete(id);
    if (!politician.photoPath) return;
    try {
      await this.storage().remove(politician.photoPath);
    } catch (error) {
      console.error("Politician photo cleanup error:", error);
    }
  }
}
