import "server-only";

import {
  type OrganizationSyncImportResult,
  SyncImportOrganizationNotFoundError,
  SyncImportValidationError,
} from "@/server/contexts/data-import/domain/models/organization-sync-import";
import type { IOrganizationSyncImportRepository } from "@/server/contexts/data-import/domain/repositories/organization-sync-import-repository.interface";
import { parseOrganizationSyncImportFile } from "@/server/contexts/data-import/domain/services/organization-sync-import-parser";
import {
  assertSyncImportAllowed,
  type SyncImportEnvironment,
} from "@/server/contexts/data-import/domain/services/sync-import-availability";
import type { ICacheInvalidator } from "@/server/contexts/shared/domain/services/cache-invalidator.interface";

interface ImportOrganizationSyncInput {
  fileText: string;
  /** 画面で入力させる団体 slug。ファイルの slug と一致しなければ実行しない。 */
  confirmationSlug: string;
  environment: SyncImportEnvironment;
}

/**
 * 同期用 JSON を取り込み、政治団体 1 件分の政治資金データを丸ごと置き換える。
 *
 * ステージングにしか残っていない取引を消してズレを解消するのが目的なので、
 * マージではなく「その団体の取引を全削除してから入れ直す」置換方式にしている。
 */
export class ImportOrganizationSyncUsecase {
  constructor(
    private readonly repository: IOrganizationSyncImportRepository,
    private readonly cacheInvalidator: ICacheInvalidator,
  ) {}

  async execute(input: ImportOrganizationSyncInput): Promise<OrganizationSyncImportResult> {
    assertSyncImportAllowed(input.environment);

    const file = parseOrganizationSyncImportFile(input.fileText);

    if (input.confirmationSlug.trim() !== file.meta.organizationSlug) {
      throw new SyncImportValidationError(
        `入力された slug がファイルの政治団体 slug "${file.meta.organizationSlug}" と一致しません`,
      );
    }

    const organization = await this.repository.findOrganizationBySlug(file.meta.organizationSlug);
    if (!organization) {
      throw new SyncImportOrganizationNotFoundError(
        `ファイルの政治団体 slug "${file.meta.organizationSlug}" に一致する政治団体がこの環境にありません`,
      );
    }

    const result = await this.repository.replaceOrganizationSyncData({
      politicalOrganizationId: organization.id,
      file,
    });

    // ここまで来れば DB は置き換わっている。キャッシュ無効化の失敗で
    // 取り込み全体を失敗扱いにはせず、警告として返す。
    let cacheInvalidationError: string | null = null;
    try {
      await this.cacheInvalidator.invalidateWebappCache();
    } catch (error) {
      cacheInvalidationError = error instanceof Error ? error.message : String(error);
    }

    return {
      organizationSlug: file.meta.organizationSlug,
      ...result,
      cacheInvalidationError,
    };
  }
}
