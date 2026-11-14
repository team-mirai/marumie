import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { IProfilePhotoStorage } from "@/server/contexts/public-finance/domain/repositories/profile-photo-storage.interface";

/** admin が顔写真を置く非公開バケットの既定名（admin の POLITICIAN_PHOTO_BUCKET の既定値と同じ） */
const DEFAULT_BUCKET = "politician-photos";

/**
 * 議員・政治団体の代表者の顔写真は、admin がアップロードした非公開バケットから署名URLで配信する（#1916, #1917）。
 */
export class SupabaseProfilePhotoStorage implements IProfilePhotoStorage {
  constructor(
    private client: ReturnType<typeof createClient>,
    private bucket: string,
  ) {}

  /** ストレージが未設定の環境（ローカルなど）では null を返し、写真を出さない */
  static fromEnv(): SupabaseProfilePhotoStorage | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return new SupabaseProfilePhotoStorage(
      createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
      process.env.POLITICIAN_PHOTO_BUCKET?.trim() || DEFAULT_BUCKET,
    );
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
