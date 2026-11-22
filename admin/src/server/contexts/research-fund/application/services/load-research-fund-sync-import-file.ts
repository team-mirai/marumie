import "server-only";

import type { ResearchFundSyncExport } from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import {
  assertResearchFundSyncMasterKeysExist,
  collectResearchFundSyncMasterKeys,
} from "@/server/contexts/research-fund/domain/models/research-fund-sync-import";
import type { IResearchFundSyncImportRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-import-repository.interface";
import { parseResearchFundSyncImportFile } from "@/server/contexts/research-fund/domain/services/research-fund-sync-import-parser";
import { readSyncImportFileText } from "@/server/contexts/shared/application/services/read-sync-import-file-text";
import type { ISyncImportFileStorage } from "@/server/contexts/shared/domain/repositories/sync-import-file-storage.interface";

/**
 * ストレージの同期用 JSON を読み、形式を検証したうえで、この環境の科目マスタで取り込めるかを確かめる。
 */
export async function loadResearchFundSyncImportFile(
  repository: IResearchFundSyncImportRepository,
  fileStorage: ISyncImportFileStorage,
  storageKey: string,
): Promise<ResearchFundSyncExport> {
  const file = parseResearchFundSyncImportFile(
    await readSyncImportFileText(fileStorage, storageKey),
  );

  const required = collectResearchFundSyncMasterKeys(file);
  const [accountKeys, legalCategoryKeys] = await Promise.all([
    repository.findExistingAccountKeys(required.accountKeys),
    repository.findExistingLegalCategoryKeys(required.legalCategoryKeys),
  ]);
  assertResearchFundSyncMasterKeysExist(required, { accountKeys, legalCategoryKeys });

  return file;
}
