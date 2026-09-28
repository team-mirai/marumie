import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SyncImportStorageError } from "@/server/contexts/data-import/domain/models/organization-sync-import";
import type {
  ISyncImportFileStorage,
  SyncImportUploadTarget,
} from "@/server/contexts/data-import/domain/repositories/sync-import-file-storage.interface";

export class SupabaseSyncImportFileStorage implements ISyncImportFileStorage {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {
    if (!bucket.trim()) throw new Error("同期用JSONの非公開バケット名が必要です");
  }

  async createUploadTarget(): Promise<SyncImportUploadTarget> {
    const storageKey = `${randomUUID()}.json`;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(storageKey);
    if (error || !data?.signedUrl) {
      console.error("Sync import signed upload URL error:", error);
      throw new SyncImportStorageError(
        `同期用JSONの置き場所（Storage バケット "${this.bucket}"）を用意できませんでした。バケットが作成されているか確認してください`,
      );
    }
    return { storageKey, uploadUrl: data.signedUrl };
  }

  async readText(storageKey: string): Promise<string> {
    const { data, error } = await this.client.storage.from(this.bucket).download(storageKey);
    if (error || !data) {
      console.error("Sync import download error:", error);
      throw new SyncImportStorageError(
        "アップロードした同期用JSONを読み出せませんでした。ファイルを選び直してください",
      );
    }
    return data.text();
  }

  async remove(storageKey: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([storageKey]);
    if (error) throw new Error("同期用JSONの削除に失敗しました", { cause: error });
  }
}
