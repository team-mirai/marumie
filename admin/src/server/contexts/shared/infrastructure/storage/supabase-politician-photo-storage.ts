import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PoliticianPhotoMime } from "@/shared/models/politician-photo";
import type { IPoliticianPhotoStorage } from "@/server/contexts/shared/domain/repositories/politician-photo-storage.interface";

/** 顔写真を置く非公開バケットの既定名。ローカルは supabase/config.toml が同名で定義する */
const DEFAULT_BUCKET = "politician-photos";

/**
 * 議員の顔写真は非公開バケットに置き、キーを politicians.photo_path に持つ。
 * 公開側（webapp）のサーバーは同じバケットから service role で取得する。
 */
export class SupabasePoliticianPhotoStorage implements IPoliticianPhotoStorage {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {
    if (!bucket.trim()) throw new Error("顔写真のバケット名が必要です");
  }

  static fromEnv(): SupabasePoliticianPhotoStorage {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("顔写真のストレージが未設定です");
    return new SupabasePoliticianPhotoStorage(
      createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
      process.env.POLITICIAN_PHOTO_BUCKET?.trim() || DEFAULT_BUCKET,
    );
  }

  async upload(path: string, bytes: Uint8Array, mime: PoliticianPhotoMime): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (error) {
      console.error("Politician photo upload error:", error);
      throw new Error(
        `顔写真のアップロードに失敗しました。Storage バケット "${this.bucket}" が作成されているか確認してください`,
      );
    }
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) throw new Error("顔写真の削除に失敗しました", { cause: error });
  }

  async createSignedUrl(path: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl)
      throw new Error("顔写真の署名URLの取得に失敗しました", { cause: error });
    return data.signedUrl;
  }
}
