import "server-only";

import {
  SyncImportValidationError,
  validateSyncImportFileSize,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";
import type {
  ISyncImportFileStorage,
  SyncImportUploadTarget,
} from "@/server/contexts/data-import/domain/repositories/sync-import-file-storage.interface";
import {
  assertSyncImportAllowed,
  type SyncImportEnvironment,
} from "@/server/contexts/data-import/domain/services/sync-import-availability";

interface PrepareSyncImportUploadInput {
  /** ブラウザで選ばれたファイルのバイト数。 */
  fileSize: number;
  environment: SyncImportEnvironment;
}

/**
 * 同期用 JSON をブラウザからストレージへ直接置くためのアップロード先を発行する。
 *
 * 実運用サイズのファイル（数十 MB）は Vercel の関数のリクエストボディ上限（4.5MB）を超えるので、
 * ファイル本体は関数を通さず、確認・取り込みではストレージのキーだけを受け渡す。
 */
export class PrepareSyncImportUploadUsecase {
  constructor(private readonly fileStorage: ISyncImportFileStorage) {}

  async execute(input: PrepareSyncImportUploadInput): Promise<SyncImportUploadTarget> {
    assertSyncImportAllowed(input.environment);

    const sizeError = validateSyncImportFileSize(input.fileSize);
    if (sizeError) throw new SyncImportValidationError(sizeError);

    return this.fileStorage.createUploadTarget();
  }
}
