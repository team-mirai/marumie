import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { IOrganizationPhotoStorage } from "@/server/contexts/public-finance/domain/repositories/organization-photo-storage.interface";

/** 顔写真を置く非公開バケットの既定名（admin と同じ。ローカルは supabase/config.toml が同名で定義する） */
const DEFAULT_BUCKET = "politician-photos";

/**
 * 政治団体の代表者の顔写真は、admin が議員の顔写真と同じ非公開バケットに置く（キーは political_organizations.photo_path）。
 * 公開側は service role で署名URLを作って配信する。
 */
export class SupabaseOrganizationPhotoStorage implements IOrganizationPhotoStorage {
  constructor(
    private client: ReturnType<typeof createClient>,
    private bucket: string,
  ) {}

  /** ストレージの環境変数が無い環境では null を返す（写真の代わりに人型のアイコンを出す） */
  static fromEnv(): SupabaseOrganizationPhotoStorage | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return new SupabaseOrganizationPhotoStorage(
      createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
      process.env.POLITICIAN_PHOTO_BUCKET?.trim() || DEFAULT_BUCKET,
    );
  }

  async createSignedUrl(photoPath: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(photoPath, expiresIn);
    if (error || !data?.signedUrl)
      throw new Error("顔写真の署名URLの取得に失敗しました", { cause: error });
    return data.signedUrl;
  }
}
