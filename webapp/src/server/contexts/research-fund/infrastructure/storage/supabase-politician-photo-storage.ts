import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { PoliticianPhotoStorage } from "@/server/contexts/research-fund/domain/repositories/politician-photo-storage.interface";

/** 顔写真を置く非公開バケットの既定名。admin の既定値・supabase/config.toml と揃える */
const DEFAULT_BUCKET = "politician-photos";

/** 議員の顔写真は admin が非公開バケットに置き、webapp は署名URLで配信する（#1916）。 */
export class SupabasePoliticianPhotoStorage implements PoliticianPhotoStorage {
  constructor(
    private client: ReturnType<typeof createClient>,
    private bucket: string,
  ) {}

  static fromEnv(): SupabasePoliticianPhotoStorage | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return new SupabasePoliticianPhotoStorage(
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
