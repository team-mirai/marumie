import "server-only";

import {
  matchesResearchFundSyncConfirmation,
  type ResearchFundSyncImportResult,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import type { IResearchFundSyncImportRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-import-repository.interface";
import { loadResearchFundSyncImportFile } from "@/server/contexts/research-fund/application/services/load-research-fund-sync-import-file";
import { invalidateWebappCache } from "@/server/contexts/shared/application/services/invalidate-webapp-cache";
import { SyncImportValidationError } from "@/server/contexts/shared/domain/models/sync-import-file";
import type { ISyncImportFileStorage } from "@/server/contexts/shared/domain/repositories/sync-import-file-storage.interface";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";
import {
  assertSyncImportAllowed,
  type SyncImportEnvironment,
} from "@/server/contexts/shared/domain/services/sync-import-availability";

interface ImportResearchFundSyncInput {
  /** ブラウザがストレージに置いた同期用 JSON のキー（PrepareSyncImportUploadUsecase が発行）。 */
  storageKey: string;
  /** 画面で入力させる議員 slug（ファイルの全議員分）。一致しなければ実行しない。 */
  confirmation: string;
  environment: SyncImportEnvironment;
}

/**
 * 同期用 JSON を取り込み、ファイルに入っている議員室の調研費データを丸ごと置き換える。
 *
 * ステージングの議員室を本番の写しにするのが目的なので、マージではなく
 * 「その議員室の調研費データを全削除してから入れ直す」置換方式にしている。
 */
export class ImportResearchFundSyncUsecase {
  constructor(
    private readonly repository: IResearchFundSyncImportRepository,
    private readonly cacheInvalidator: ICacheInvalidator,
    private readonly fileStorage: ISyncImportFileStorage,
  ) {}

  async execute(input: ImportResearchFundSyncInput): Promise<ResearchFundSyncImportResult> {
    assertSyncImportAllowed(input.environment);

    const file = await loadResearchFundSyncImportFile(
      this.repository,
      this.fileStorage,
      input.storageKey,
    );

    const slugs = file.politicians.map((politician) => politician.profile.slug);
    if (!matchesResearchFundSyncConfirmation(input.confirmation, slugs)) {
      throw new SyncImportValidationError(
        `入力された slug がファイルの議員 slug（${slugs.join(", ")}）と一致しません`,
      );
    }

    const politicians = await this.repository.replaceResearchFundSyncData(file);

    // ここまで来れば DB は置き換わっている。キャッシュ無効化の失敗で
    // 取り込み全体を失敗扱いにはせず、警告として返す。
    const cacheInvalidationError = await invalidateWebappCache(this.cacheInvalidator);

    // 取り込み済みのファイルは不要なので消す。消せなくても取り込みは成功しているので失敗扱いにしない。
    try {
      await this.fileStorage.remove(input.storageKey);
    } catch (error) {
      console.error("Research fund sync import file cleanup error:", error);
    }

    return { politicians, cacheInvalidationError };
  }
}
