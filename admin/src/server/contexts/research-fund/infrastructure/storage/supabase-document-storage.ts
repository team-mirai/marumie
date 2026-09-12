import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ResearchFundDocument } from "@/server/contexts/research-fund/domain/models/document";
import type { DocumentStorage } from "@/server/contexts/research-fund/domain/repositories/document-storage.interface";
import type { ResearchFundResult } from "@/server/contexts/research-fund/domain/types/validation";

export class SupabaseDocumentStorage implements DocumentStorage {
  constructor(
    private client: SupabaseClient,
    private bucket: string,
  ) {
    if (!bucket.trim()) throw new Error("領収書の非公開バケット名が必要です");
  }

  async upload(bytes: Uint8Array, mime: string): Promise<ResearchFundResult<string>> {
    const validation = ResearchFundDocument.validateFile(bytes, mime);
    if (validation.status === "invalid") return validation;
    const storageKey = randomUUID();
    const { error } = await this.client.storage.from(this.bucket).upload(storageKey, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error("領収書のアップロードに失敗しました", { cause: error });
    return { status: "valid", value: storageKey };
  }

  async download(storageKey: string): Promise<ResearchFundResult<Uint8Array>> {
    const { data, error } = await this.client.storage.from(this.bucket).download(storageKey);
    if (error || !data) throw new Error("領収書の原本の取得に失敗しました", { cause: error });
    return { status: "valid", value: new Uint8Array(await data.arrayBuffer()) };
  }

  async createSignedUrl(
    storageKey: string,
    expiresIn: number,
  ): Promise<ResearchFundResult<string>> {
    const validation = ResearchFundDocument.validateExpiry(expiresIn);
    if (validation.status === "invalid") return validation;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(storageKey, expiresIn);
    if (error || !data?.signedUrl)
      throw new Error("領収書の署名URLの取得に失敗しました", { cause: error });
    return { status: "valid", value: data.signedUrl };
  }

  async remove(storageKey: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([storageKey]);
    if (error) throw new Error("領収書の削除に失敗しました", { cause: error });
  }
}
