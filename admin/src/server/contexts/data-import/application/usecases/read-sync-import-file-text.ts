import "server-only";

import {
  isSyncImportStorageKey,
  SyncImportValidationError,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";
import type { ISyncImportFileStorage } from "@/server/contexts/data-import/domain/repositories/sync-import-file-storage.interface";

/** サーバーが発行したキーであることを確かめてから、ストレージの同期用 JSON を読み出す。 */
export async function readSyncImportFileText(
  fileStorage: ISyncImportFileStorage,
  storageKey: string,
): Promise<string> {
  if (!isSyncImportStorageKey(storageKey)) {
    throw new SyncImportValidationError("アップロードしたファイルの指定が不正です");
  }
  return fileStorage.readText(storageKey);
}
