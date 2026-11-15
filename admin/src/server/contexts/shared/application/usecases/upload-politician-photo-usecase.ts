import "server-only";
import { randomUUID } from "node:crypto";
import { Politician } from "@/shared/models/politician";
import { PoliticianPhoto } from "@/shared/models/politician-photo";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";
import type { IPoliticianRepository } from "@/server/contexts/shared/domain/repositories/politician-repository.interface";

/**
 * 議員の顔写真を登録・差し替える。新しい写真を置いてから議員の参照を付け替え、古い写真を消す。
 * 古い写真の削除に失敗しても、登録は確定しているので失敗にしない（Storage に残るだけ）。
 */
export class UploadPoliticianPhotoUsecase {
  constructor(
    private repository: IPoliticianRepository,
    private storage: IPoliticianPhotoStorage,
  ) {}

  async execute(id: string, bytes: Uint8Array) {
    const politician = Politician.isValidId(id) ? await this.repository.findById(id) : null;
    if (!politician) throw new Error("議員が見つかりません");
    const validation = PoliticianPhoto.validate(bytes);
    if (validation.status === "invalid") throw new Error(validation.message);

    const path = PoliticianPhoto.buildPath(id, validation.mime, randomUUID());
    await this.storage.upload(path, bytes, validation.mime);
    try {
      await this.repository.setPhotoPath(id, path);
    } catch (error) {
      await this.removeQuietly(path);
      throw error;
    }
    if (politician.photoPath) await this.removeQuietly(politician.photoPath);
  }

  private async removeQuietly(path: string) {
    try {
      await this.storage.remove(path);
    } catch (error) {
      console.error("Politician photo cleanup error:", error);
    }
  }
}
