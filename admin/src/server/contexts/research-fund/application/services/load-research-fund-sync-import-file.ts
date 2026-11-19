import "server-only";

import type { ResearchFundSyncExport } from "@/server/contexts/research-fund/domain/models/research-fund-sync-export";
import type { IResearchFundSyncImportRepository } from "@/server/contexts/research-fund/domain/repositories/research-fund-sync-import-repository.interface";
import { parseResearchFundSyncImportFile } from "@/server/contexts/research-fund/domain/services/research-fund-sync-import-parser";
import { readSyncImportFileText } from "@/server/contexts/shared/application/services/read-sync-import-file-text";
import { SyncImportValidationError } from "@/server/contexts/shared/domain/models/sync-import-file";
import type { ISyncImportFileStorage } from "@/server/contexts/shared/domain/repositories/sync-import-file-storage.interface";

/**
 * ストレージの同期用 JSON を読み、形式を検証したうえで、この環境の科目マスタで取り込めるかを確かめる。
 * 科目・法定区分はマスタ（環境ごとに seed される）を参照するので、無いキーがあれば取り込めない。
 */
export async function loadResearchFundSyncImportFile(
  repository: IResearchFundSyncImportRepository,
  fileStorage: ISyncImportFileStorage,
  storageKey: string,
): Promise<ResearchFundSyncExport> {
  const file = parseResearchFundSyncImportFile(
    await readSyncImportFileText(fileStorage, storageKey),
  );

  const entries = file.politicians.flatMap((politician) =>
    politician.books.flatMap((book) => book.journalEntries),
  );
  const accountKeys = [
    ...new Set(entries.flatMap((entry) => entry.lines.map((line) => line.accountKey))),
  ];
  const legalCategoryKeys = [
    ...new Set(
      entries.flatMap((entry) =>
        entry.legalCategoryOverride ? [entry.legalCategoryOverride.legalCategoryKey] : [],
      ),
    ),
  ];

  const [existingAccountKeys, existingLegalCategoryKeys] = await Promise.all([
    repository.findExistingAccountKeys(accountKeys),
    repository.findExistingLegalCategoryKeys(legalCategoryKeys),
  ]);

  const missingAccountKeys = accountKeys.filter((key) => !existingAccountKeys.includes(key));
  if (missingAccountKeys.length > 0) {
    throw new SyncImportValidationError(
      `この環境の科目マスタに無い科目があります: ${missingAccountKeys.join(", ")}`,
    );
  }

  const missingLegalCategoryKeys = legalCategoryKeys.filter(
    (key) => !existingLegalCategoryKeys.includes(key),
  );
  if (missingLegalCategoryKeys.length > 0) {
    throw new SyncImportValidationError(
      `この環境の科目マスタに無い法定区分があります: ${missingLegalCategoryKeys.join(", ")}`,
    );
  }

  return file;
}
