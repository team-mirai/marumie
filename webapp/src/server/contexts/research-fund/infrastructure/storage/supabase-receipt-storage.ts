import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { ReceiptStorage } from "@/server/contexts/research-fund/domain/repositories/receipt-storage.interface";

/**
 * 領収書の原本は非公開バケットに置き、署名URLで配信する（admin と同じバケット）。
 * 当面はマスキングなしで原本を公開する運用のため、masked_key は使わない。
 */
export class SupabaseReceiptStorage implements ReceiptStorage {
  constructor(
    private client: ReturnType<typeof createClient>,
    private bucket: string,
  ) {}

  static fromEnv(): SupabaseReceiptStorage | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.RESEARCH_FUND_DOCUMENT_BUCKET;
    if (!url || !key || !bucket) return null;
    return new SupabaseReceiptStorage(
      createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }),
      bucket,
    );
  }

  async createSignedUrl(storageKey: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresIn);
    if (error || !data?.signedUrl)
      throw new Error("領収書の署名URLの取得に失敗しました", { cause: error });
    return data.signedUrl;
  }
}
