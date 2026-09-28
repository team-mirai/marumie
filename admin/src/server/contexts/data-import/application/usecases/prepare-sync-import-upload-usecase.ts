import "server-only";

import {
  SyncImportValidationError,
  selectStaleSyncImportStorageKeys,
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
 *
 * 確認だけして取り込まなかった・選び直した・取り込みに失敗したファイルはストレージに残るので、
 * 新しいファイルを置く前に、取り込まれずに時間が経ったものを消しておく。
 */
export class PrepareSyncImportUploadUsecase {
  constructor(
    private readonly fileStorage: ISyncImportFileStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: PrepareSyncImportUploadInput): Promise<SyncImportUploadTarget> {
    assertSyncImportAllowed(input.environment);

    const sizeError = validateSyncImportFileSize(input.fileSize);
    if (sizeError) throw new SyncImportValidationError(sizeError);

    await this.removeStaleFiles();

    return this.fileStorage.createUploadTarget();
  }

  /** 片付けに失敗しても、これから置くファイルの取り込みは妨げない。 */
  private async removeStaleFiles(): Promise<void> {
    try {
      const staleKeys = selectStaleSyncImportStorageKeys(await this.fileStorage.list(), this.now());
      await this.fileStorage.removeMany(staleKeys);
    } catch (error) {
      console.error("Sync import stale file cleanup error:", error);
    }
  }
}
