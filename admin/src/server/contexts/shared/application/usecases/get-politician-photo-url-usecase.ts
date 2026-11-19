import "server-only";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";

/** 編集画面のプレビューに出す、顔写真の一時的な URL の有効期間（秒） */
const PREVIEW_EXPIRES_IN = 60 * 60;

/**
 * 編集画面で今の顔写真を見せるための署名 URL を返す。
 * Storage が未設定・取得失敗のときは、編集そのものは続けられるよう null を返す。
 */
export class GetPoliticianPhotoUrlUsecase {
  constructor(private storage: () => IPoliticianPhotoStorage) {}

  async execute(photoPath: string | null): Promise<string | null> {
    if (!photoPath) return null;
    try {
      return await this.storage().createSignedUrl(photoPath, PREVIEW_EXPIRES_IN);
    } catch (error) {
      console.error("Politician photo preview error:", error);
      return null;
    }
  }
}
