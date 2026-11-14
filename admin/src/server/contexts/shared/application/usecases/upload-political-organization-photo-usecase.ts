import "server-only";
import { randomUUID } from "node:crypto";
import { PoliticianPhoto } from "@/shared/models/politician-photo";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";
import type { IPoliticalOrganizationRepository } from "@/server/contexts/shared/domain/repositories/political-organization-repository.interface";

/**
 * 政治団体の代表者の顔写真を登録・差し替える。議員の顔写真と同じ形式・上限・バケットを使う。
 * 新しい写真を置いてから政治団体の参照を付け替え、古い写真を消す。
 * 古い写真の削除に失敗しても、登録は確定しているので失敗にしない（Storage に残るだけ）。
 */
export class UploadPoliticalOrganizationPhotoUsecase {
  constructor(
    private repository: IPoliticalOrganizationRepository,
    private storage: IPoliticianPhotoStorage,
  ) {}

  async execute(id: string, bytes: Uint8Array) {
    const organization = /^[1-9]\d*$/.test(id) ? await this.repository.findById(BigInt(id)) : null;
    if (!organization) throw new Error("政治団体が見つかりません");
    const validation = PoliticianPhoto.validate(bytes);
    if (validation.status === "invalid") throw new Error(validation.message);

    const path = PoliticianPhoto.buildPoliticalOrganizationPath(id, validation.mime, randomUUID());
    await this.storage.upload(path, bytes, validation.mime);
    try {
      await this.repository.setPhotoPath(BigInt(id), path);
    } catch (error) {
      await this.removeQuietly(path);
      throw error;
    }
    if (organization.photoPath) await this.removeQuietly(organization.photoPath);
  }

  private async removeQuietly(path: string) {
    try {
      await this.storage.remove(path);
    } catch (error) {
      console.error("Political organization photo cleanup error:", error);
    }
  }
}
